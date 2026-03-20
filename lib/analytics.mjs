/**
 * CRM Analytics Engine v2
 * Uses battle-tested npm libraries instead of custom implementations.
 *
 * simple-statistics  — descriptive stats, regression, z-score, quantiles
 * ml-regression      — polynomial / exponential trend fitting
 * ml-logistic-regression — conversion prediction (won/lost)
 * ml-random-forest   — ML-based lead scoring
 * ml-kmeans          — lead segmentation (clustering)
 * holtwinters        — time-series forecast (Holt-Winters triple exp. smoothing)
 */

import * as ss from 'simple-statistics';
import { PolynomialRegression } from 'ml-regression';
import { RandomForestClassifier } from 'ml-random-forest';
import { kmeans } from 'ml-kmeans';

let LogisticRegression;
try { LogisticRegression = (await import('ml-logistic-regression')).default; } catch { LogisticRegression = null; }

let holtwinters;
try { holtwinters = (await import('holtwinters')).default; } catch { holtwinters = null; }

// ─── Hardcoded constants (exported for backward compat) ───

export const STAGE_ORDER = ['newLead', 'qualification', 'proposal', 'negotiation', 'contract', 'projectOpened'];
export const STAGE_LABELS = {
  newLead: 'Новый лид', qualification: 'Квалификация', proposal: 'КП отправлено',
  negotiation: 'Переговоры', contract: 'Договор', projectOpened: 'Проект открыт',
};
export const PIPELINE_WEIGHTS = {
  newLead: 0.05, qualification: 0.10, proposal: 0.20,
  negotiation: 0.50, contract: 0.80, projectOpened: 1.0,
};
const WON_STAGES = ['contract', 'projectOpened'];
const LOST_STAGES = ['rejected', 'closed'];

const SCORE_WEIGHTS = { budget: 0.30, source: 0.20, type: 0.20, age: 0.15, stage: 0.15 };
const SOURCE_SCORES = {
  'Рекомендация': 90, 'Повторный клиент': 85, 'Партнёр': 75, 'Тендер': 70,
  'Выставка': 60, 'Сайт': 50, 'Холодный звонок': 30,
};
const TYPE_SCORES = {
  'Жилой дом / ЖК': 90, 'Коммерческий': 85, 'Спортивный': 80, 'Школа / Детский сад': 75,
  'Административное': 70, 'ОКН': 65, 'Реконструкция': 60, 'Мастер-план': 55,
  'Интерьер': 50, 'Благоустройство': 40,
};

// ─── Configurable defaults ───

/**
 * Default field map for CRM queue.
 * Each canonical key maps to an ordered list of aliases searched
 * in customFields (by exact key, then by case-insensitive substring).
 */
export const DEFAULT_CRM_FIELD_MAP = {
  budget:        ['budgetKP', 'Бюджет КП', 'contractSum', 'Сумма договора'],
  source:        ['leadSource', 'Источник лида'],
  objectType:    ['objectType', 'Тип объекта'],
  contactPerson: ['contactPerson', 'Контактное лицо'],
  rejectReason:  ['rejectReason', 'Причина отказа'],
  area:          ['area', 'Площадь объекта'],
  stage:         ['stage', 'Стадия'],
};

/**
 * Default stage config for CRM pipeline.
 * Mirrors STAGE_ORDER / STAGE_LABELS / PIPELINE_WEIGHTS / WON_STAGES / LOST_STAGES.
 */
export const DEFAULT_CRM_STAGES = {
  order:   STAGE_ORDER,
  labels:  STAGE_LABELS,
  weights: PIPELINE_WEIGHTS,
  won:     WON_STAGES,
  lost:    LOST_STAGES,
};

// ─── Internal field lookup ───

/**
 * Low-level field finder: searches customFields by explicit key list.
 * Kept as internal helper; prefer resolveField() in new code.
 */
function findField(cf, ...keys) {
  if (!cf) return undefined;
  for (const k of keys) {
    if (cf[k] !== undefined && cf[k] !== null) return cf[k];
  }

  // Fallback for renamed/variant field labels from Tracker.
  const normalized = Object.entries(cf).map(([k, v]) => [String(k).toLowerCase(), v]);
  const aliases = keys.map((k) => String(k).toLowerCase());
  for (const [k, v] of normalized) {
    if (v === undefined || v === null) continue;
    if (aliases.some((a) => k.includes(a) || a.includes(k))) return v;
    if (aliases.includes('бюджет кп') && (k.includes('бюджет') || k.includes('budget'))) return v;
    if (aliases.includes('источник лида') && (k.includes('источник') || k.includes('source'))) return v;
    if (aliases.includes('тип объекта') && (k.includes('тип') || k.includes('object'))) return v;
    if (aliases.includes('сумма договора') && (k.includes('договор') || k.includes('contract'))) return v;
  }
  return undefined;
}

/**
 * Resolve a canonical field from customFields using a field map.
 * Falls back to DEFAULT_CRM_FIELD_MAP when no map is provided.
 */
export function resolveField(cf, canonicalKey, fieldMap = DEFAULT_CRM_FIELD_MAP) {
  if (!cf) return undefined;
  const aliases = fieldMap[canonicalKey];
  if (!aliases || aliases.length === 0) return undefined;
  return findField(cf, ...aliases);
}

// ─── Factory functions ───

/**
 * Build a fieldMap compatible with resolveField() from rows in queue_fields table.
 * Rows: [{ field_key: string, label: string, type: string, ... }]
 */
export function buildFieldMapFromQueueFields(queueFields) {
  if (!Array.isArray(queueFields) || queueFields.length === 0) return DEFAULT_CRM_FIELD_MAP;

  const CANONICAL_KEYS_MAP = {
    budget:        ['budgetKP', 'contractSum'],
    source:        ['leadSource'],
    objectType:    ['objectType'],
    contactPerson: ['contactPerson'],
    rejectReason:  ['rejectReason'],
    area:          ['area'],
    stage:         ['stage'],
  };

  const fieldMap = {};
  for (const [canonical, matchKeys] of Object.entries(CANONICAL_KEYS_MAP)) {
    const aliases = [];
    for (const qf of queueFields) {
      if (matchKeys.includes(qf.field_key)) {
        aliases.push(qf.field_key);
        if (qf.label && qf.label !== qf.field_key) aliases.push(qf.label);
      }
    }
    fieldMap[canonical] = aliases.length > 0 ? aliases : DEFAULT_CRM_FIELD_MAP[canonical];
  }

  return fieldMap;
}

/**
 * Build a stageConfig compatible with all analytics functions from queue statuses JSONB.
 * Statuses: [{ key: string, display: string, type: 'initial'|'progress'|'done', color?: string }]
 */
export function buildStageConfigFromStatuses(statuses) {
  if (!Array.isArray(statuses) || statuses.length === 0) return DEFAULT_CRM_STAGES;

  const order = statuses.map((s) => s.key);
  const labels = {};
  for (const s of statuses) labels[s.key] = s.display || s.key;

  const won = statuses
    .filter((s) => s.type === 'done' &&
      !s.key.toLowerCase().includes('reject') &&
      !s.key.toLowerCase().includes('closed'))
    .map((s) => s.key);

  const lost = statuses
    .filter((s) =>
      s.key.toLowerCase().includes('reject') ||
      s.key.toLowerCase().includes('closed'))
    .map((s) => s.key);

  // Non-terminal stages spread evenly from 0.05 to 0.80; won = 1.0; lost = 0.0
  const progressive = statuses.filter((s) => !won.includes(s.key) && !lost.includes(s.key));
  const weights = {};
  progressive.forEach((s, i) => {
    weights[s.key] = progressive.length > 1
      ? Math.round((0.05 + (i / (progressive.length - 1)) * 0.75) * 100) / 100
      : 0.5;
  });
  for (const key of won) weights[key] = 1.0;
  for (const key of lost) weights[key] = 0.0;

  return { order, labels, weights, won, lost };
}

// ─── Utility ───

function daysBetween(a, b) {
  return Math.max(0, Math.round((b - a) / 86400000));
}

// ─── 1. Conversion rates between stages ───

export function calcConversionRates(leads, { stageConfig } = {}) {
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const byStage = {};
  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    byStage[sk] = (byStage[sk] || 0) + 1;
  }

  const cumulative = {};
  let running = 0;
  for (let i = sc.order.length - 1; i >= 0; i--) {
    running += byStage[sc.order[i]] || 0;
    cumulative[sc.order[i]] = running;
  }

  const rates = [];
  for (let i = 1; i < sc.order.length; i++) {
    const from = sc.order[i - 1];
    const to = sc.order[i];
    const fromCount = cumulative[from] || 0;
    const toCount = cumulative[to] || 0;
    rates.push({
      from, to,
      fromLabel: sc.labels[from], toLabel: sc.labels[to],
      fromCount, toCount,
      rate: fromCount > 0 ? Math.round((toCount / fromCount) * 1000) / 1000 : 0,
    });
  }
  return rates;
}

// ─── 2. Velocity: time in each status ───

export function calcVelocity(leads, { stageConfig } = {}) {
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const now = new Date();
  const daysByStage = {};

  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    if (!l.createdAt) continue;
    const created = new Date(l.createdAt);
    const updated = l.updatedAt ? new Date(l.updatedAt) : now;
    const days = Math.max(1, daysBetween(created, updated));
    if (!daysByStage[sk]) daysByStage[sk] = [];
    daysByStage[sk].push(days);
  }

  return sc.order.map(sk => {
    const arr = daysByStage[sk] || [];
    if (arr.length === 0) return null;
    return {
      stage: sk,
      label: sc.labels[sk],
      median: ss.median(arr),
      avg: Math.round(ss.mean(arr)),
      stdDev: Math.round(ss.standardDeviation(arr) * 10) / 10,
      p90: ss.quantile(arr, 0.9),
      count: arr.length,
    };
  }).filter(Boolean);
}

// ─── 2b. Exact velocity from changelog data ───

export function calcVelocityFromChangelog(changelogs, { stageConfig } = {}) {
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const durationsByStage = {};

  for (const { changes } of changelogs) {
    if (!changes || !Array.isArray(changes)) continue;
    const statusChanges = changes
      .filter(c => c.field === 'status' || c.field === 'Статус')
      .sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));

    for (let i = 0; i < statusChanges.length; i++) {
      const from = statusChanges[i].from?.key;
      const ts = new Date(statusChanges[i].updatedAt);
      const nextTs = i + 1 < statusChanges.length
        ? new Date(statusChanges[i + 1].updatedAt)
        : new Date();
      if (from && sc.order.includes(from)) {
        if (!durationsByStage[from]) durationsByStage[from] = [];
        durationsByStage[from].push(daysBetween(ts, nextTs));
      }
    }
  }

  return sc.order.map(sk => {
    const arr = durationsByStage[sk] || [];
    if (arr.length === 0) return null;
    return {
      stage: sk,
      label: sc.labels[sk],
      median: ss.median(arr),
      avg: Math.round(ss.mean(arr)),
      stdDev: Math.round(ss.standardDeviation(arr) * 10) / 10,
      p90: ss.quantile(arr, 0.9),
      count: arr.length,
    };
  }).filter(Boolean);
}

// ─── 3. Lead scoring (weighted fallback) ───

export function scoreLead(lead, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const cf = lead.customFields || {};
  const budget = resolveField(cf, 'budget', fm);
  const source = resolveField(cf, 'source', fm);
  const objType = resolveField(cf, 'objectType', fm);
  const sk = lead.statusKey || sc.order[0] || 'newLead';
  const createdAt = lead.createdAt ? new Date(lead.createdAt) : new Date();
  const ageDays = Math.max(1, daysBetween(createdAt, new Date()));

  const budgetScore = budget ? Math.min(100, Math.round(Math.log10(Math.max(1, Number(budget))) * 20)) : 30;
  const sourceScore = SOURCE_SCORES[source] || 40;
  const typeScore = TYPE_SCORES[objType] || 40;
  const stageIdx = sc.order.indexOf(sk);
  const stageScore = stageIdx >= 0 ? Math.round((stageIdx / (sc.order.length - 1)) * 100) : 20;
  const ageScore = Math.max(0, Math.round(100 - (ageDays / 90) * 100));

  const total = Math.round(
    budgetScore * SCORE_WEIGHTS.budget +
    sourceScore * SCORE_WEIGHTS.source +
    typeScore * SCORE_WEIGHTS.type +
    ageScore * SCORE_WEIGHTS.age +
    stageScore * SCORE_WEIGHTS.stage
  );

  return {
    key: lead.key,
    summary: lead.summary,
    score: Math.min(100, Math.max(0, total)),
    breakdown: { budgetScore, sourceScore, typeScore, ageScore, stageScore },
  };
}

export function scoreAllLeads(leads, config = {}) {
  return leads.map(l => scoreLead(l, config)).sort((a, b) => b.score - a.score);
}

// ─── 4. ML-based scoring (Random Forest) ───

function encodeLeadFeatures(lead, fm = DEFAULT_CRM_FIELD_MAP, sc = DEFAULT_CRM_STAGES) {
  const cf = lead.customFields || {};
  const budget = Number(resolveField(cf, 'budget', fm) || 0);
  const source = resolveField(cf, 'source', fm) || '';
  const objType = resolveField(cf, 'objectType', fm) || '';
  const sk = lead.statusKey || sc.order[0] || 'newLead';
  const ageDays = lead.createdAt ? daysBetween(new Date(lead.createdAt), new Date()) : 30;

  return [
    budget > 0 ? Math.log10(budget) : 0,
    SOURCE_SCORES[source] || 40,
    TYPE_SCORES[objType] || 40,
    Math.min(ageDays, 365),
    sc.order.indexOf(sk) >= 0 ? sc.order.indexOf(sk) : 0,
  ];
}

export function trainScoringModel(historicalLeads, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const wonLeads = historicalLeads.filter(l => sc.won.includes(l.statusKey));
  const lostLeads = historicalLeads.filter(l => sc.lost.includes(l.statusKey));
  const total = wonLeads.length + lostLeads.length;
  if (total < 20) return null;

  const X = [];
  const Y = [];
  for (const l of wonLeads) { X.push(encodeLeadFeatures(l, fm, sc)); Y.push(1); }
  for (const l of lostLeads) { X.push(encodeLeadFeatures(l, fm, sc)); Y.push(0); }

  try {
    const rf = new RandomForestClassifier({ nEstimators: 30, maxFeatures: 3, seed: 42 });
    rf.train(X, Y);
    return rf;
  } catch {
    return null;
  }
}

export function predictWithModel(model, lead, { fieldMap, stageConfig } = {}) {
  if (!model) return null;
  try {
    const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
    const sc = stageConfig || DEFAULT_CRM_STAGES;
    const features = encodeLeadFeatures(lead, fm, sc);
    const prediction = model.predict([features]);
    return prediction[0];
  } catch {
    return null;
  }
}

// ─── 5. Conversion prediction (Logistic Regression) ───

export function trainConversionModel(historicalLeads, { fieldMap, stageConfig } = {}) {
  if (!LogisticRegression) return null;
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const wonLeads = historicalLeads.filter(l => sc.won.includes(l.statusKey));
  const lostLeads = historicalLeads.filter(l => sc.lost.includes(l.statusKey));
  if (wonLeads.length < 5 || lostLeads.length < 5) return null;

  const X = [];
  const Y = [];
  for (const l of wonLeads) { X.push(encodeLeadFeatures(l, fm, sc)); Y.push(1); }
  for (const l of lostLeads) { X.push(encodeLeadFeatures(l, fm, sc)); Y.push(0); }

  try {
    const model = new LogisticRegression({ numSteps: 500, learningRate: 0.01 });
    model.train(X, Y);
    return model;
  } catch {
    return null;
  }
}

export function predictConversion(model, lead, { fieldMap, stageConfig } = {}) {
  if (!model) return null;
  try {
    const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
    const sc = stageConfig || DEFAULT_CRM_STAGES;
    const features = encodeLeadFeatures(lead, fm, sc);
    return model.predict([features])[0];
  } catch {
    return null;
  }
}

// ─── 6. Weighted pipeline forecast ───

export function forecastRevenue(leads, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  let totalWeighted = 0;
  let totalRaw = 0;
  const byStage = {};

  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    const budget = Number(resolveField(l.customFields || {}, 'budget', fm) || 0);
    const weight = sc.weights[sk] || 0;

    if (!byStage[sk]) byStage[sk] = { raw: 0, weighted: 0, count: 0 };
    byStage[sk].raw += budget;
    byStage[sk].weighted += budget * weight;
    byStage[sk].count++;

    totalRaw += budget;
    totalWeighted += budget * weight;
  }

  return {
    totalRaw: Math.round(totalRaw),
    totalWeighted: Math.round(totalWeighted),
    byStage: sc.order.map(sk => ({
      stage: sk,
      label: sc.labels[sk],
      weight: sc.weights[sk],
      ...(byStage[sk] || { raw: 0, weighted: 0, count: 0 }),
    })).filter(s => s.count > 0),
  };
}

// ─── 7. Anomaly detection (Z-score via simple-statistics) ───

export function detectAnomalies(leads, { stageConfig } = {}) {
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const doneStatuses = [...sc.won, ...sc.lost];
  const now = new Date();
  const activeLeads = leads.filter(l =>
    l.createdAt && !doneStatuses.includes(l.statusKey)
  );
  if (activeLeads.length < 3) return [];

  const ages = activeLeads.map(l => {
    const updated = l.updatedAt ? new Date(l.updatedAt) : now;
    return Math.max(1, daysBetween(updated, now));
  });

  const mean = ss.mean(ages);
  const std = ss.standardDeviation(ages);
  if (std < 1) return [];
  const p95 = ss.quantile(ages, 0.95);

  return activeLeads
    .map((l, i) => ({
      key: l.key,
      summary: l.summary,
      status: l.status,
      statusKey: l.statusKey,
      daysSinceUpdate: ages[i],
      zScore: Math.round(ss.zScore(ages[i], mean, std) * 100) / 100,
      isP95: ages[i] >= p95,
    }))
    .filter(a => a.zScore > 1.5)
    .sort((a, b) => b.zScore - a.zScore);
}

// ─── 8. Trend & regression (simple-statistics + ml-regression) ───

export function calcTrend(current, previous) {
  if (!previous || previous === 0) return { delta: current, pct: null };
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  return { delta, pct };
}

export function calcLinearRegression(points) {
  if (points.length < 2) return { slope: 0, intercept: 0, r2: 0 };
  const pairs = points.map(p => [p.x, p.y]);
  const reg = ss.linearRegression(pairs);
  const line = ss.linearRegressionLine(reg);
  const r2 = ss.rSquared(pairs, line);
  return {
    slope: Math.round(reg.m * 100) / 100,
    intercept: Math.round(reg.b * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
    predict: line,
  };
}

export function calcPolynomialRegression(xValues, yValues, degree = 2) {
  if (xValues.length < 3) return null;
  try {
    const reg = new PolynomialRegression(xValues, yValues, degree);
    return {
      predict: (x) => reg.predict(x),
      coefficients: reg.coefficients,
      toString: () => reg.toString(),
    };
  } catch {
    return null;
  }
}

// ─── 9. Time-series forecast (Holt-Winters) ───

export function forecastTimeSeries(series, periodsAhead = 3) {
  if (!holtwinters || series.length < 6) {
    const reg = calcLinearRegression(series.map((y, i) => ({ x: i, y })));
    const forecast = [];
    for (let i = 0; i < periodsAhead; i++) {
      forecast.push(Math.round(reg.predict(series.length + i)));
    }
    return { method: 'linear', forecast, r2: reg.r2 };
  }

  try {
    const result = holtwinters(series, periodsAhead);
    return {
      method: 'holtwinters',
      forecast: result.augumentedDataset
        ? result.augumentedDataset.slice(-periodsAhead).map(v => Math.round(v))
        : [],
      alpha: result.alpha,
      beta: result.beta,
      gamma: result.gamma,
    };
  } catch {
    const reg = calcLinearRegression(series.map((y, i) => ({ x: i, y })));
    const forecast = [];
    for (let i = 0; i < periodsAhead; i++) {
      forecast.push(Math.round(reg.predict(series.length + i)));
    }
    return { method: 'linear_fallback', forecast, r2: reg.r2 };
  }
}

// ─── 10. Lead creation trend (weekly buckets) ───

export function calcCreationTrend(leads, weeks = 8, { fieldMap, stageConfig } = {}) {
  const now = new Date();
  const buckets = Array.from({ length: weeks }, () => 0);

  for (const l of leads) {
    if (!l.createdAt) continue;
    const age = (now - new Date(l.createdAt)) / (7 * 86400000);
    const idx = Math.min(weeks - 1, Math.floor(age));
    if (idx >= 0 && idx < weeks) buckets[weeks - 1 - idx]++;
  }

  const points = buckets.map((y, i) => ({ x: i, y }));
  const reg = calcLinearRegression(points);

  return { buckets, regression: { slope: reg.slope, intercept: reg.intercept, r2: reg.r2 }, points };
}

// ─── 11. Lead segmentation (k-means clustering) ───

export function segmentLeads(leads, k = 4, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const validLeads = leads.filter(l => l.createdAt);
  if (validLeads.length < k * 2) return { segments: [], tooFewLeads: true };

  const now = new Date();
  const features = validLeads.map(l => {
    const cf = l.customFields || {};
    const budget = Number(resolveField(cf, 'budget', fm) || 0);
    const ageDays = daysBetween(new Date(l.createdAt), now);
    const stageIdx = sc.order.indexOf(l.statusKey || sc.order[0]);
    return [
      budget > 0 ? Math.log10(budget) : 0,
      Math.min(ageDays, 365) / 365,
      stageIdx >= 0 ? stageIdx / (sc.order.length - 1) : 0,
    ];
  });

  try {
    const result = kmeans(features, Math.min(k, validLeads.length));
    const segments = [];
    for (let i = 0; i < result.centroids.length; i++) {
      const members = validLeads.filter((_, idx) => result.clusters[idx] === i);
      if (members.length === 0) continue;
      const budgets = members.map(l => {
        const cf = l.customFields || {};
        return Number(resolveField(cf, 'budget', fm) || 0);
      });
      const ages = members.map(l => daysBetween(new Date(l.createdAt), now));

      segments.push({
        id: i,
        count: members.length,
        avgBudget: Math.round(ss.mean(budgets)),
        medianAge: ss.median(ages),
        centroid: result.centroids[i].map(v => Math.round(v * 100) / 100),
        leads: members.map(l => l.key),
      });
    }
    return { segments: segments.sort((a, b) => b.avgBudget - a.avgBudget), tooFewLeads: false };
  } catch {
    return { segments: [], tooFewLeads: false, error: true };
  }
}

// ─── 12. Cohort analysis ───

export function cohortAnalysis(leads, groupBy = 'month', { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const cohorts = {};
  for (const l of leads) {
    if (!l.createdAt) continue;
    const d = new Date(l.createdAt);
    const key = groupBy === 'quarter'
      ? `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!cohorts[key]) cohorts[key] = [];
    cohorts[key].push(l);
  }

  return Object.entries(cohorts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, members]) => {
      const won = members.filter(l => sc.won.includes(l.statusKey));
      const lost = members.filter(l => sc.lost.includes(l.statusKey));
      const budgets = members.map(l => {
        const cf = l.customFields || {};
        return Number(resolveField(cf, 'budget', fm) || 0);
      }).filter(b => b > 0);
      const cycleDays = won.map(l => {
        if (!l.createdAt || !l.updatedAt) return null;
        return daysBetween(new Date(l.createdAt), new Date(l.updatedAt));
      }).filter(Boolean);

      return {
        period,
        total: members.length,
        won: won.length,
        lost: lost.length,
        active: members.length - won.length - lost.length,
        conversionRate: (won.length + lost.length) > 0
          ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
        avgBudget: budgets.length > 0 ? Math.round(ss.mean(budgets)) : null,
        medianCycleDays: cycleDays.length > 0 ? ss.median(cycleDays) : null,
      };
    });
}

// ─── 13. Manager performance ───

export function managerPerformance(leads, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const byManager = {};
  for (const l of leads) {
    const mgr = l.assignee || 'Не назначен';
    if (!byManager[mgr]) byManager[mgr] = [];
    byManager[mgr].push(l);
  }

  return Object.entries(byManager).map(([manager, mLeads]) => {
    const won = mLeads.filter(l => sc.won.includes(l.statusKey));
    const lost = mLeads.filter(l => sc.lost.includes(l.statusKey));
    const budgets = won.map(l => {
      const cf = l.customFields || {};
      return Number(resolveField(cf, 'budget', fm) || 0);
    }).filter(b => b > 0);
    const cycleDays = won.map(l => {
      if (!l.createdAt || !l.updatedAt) return null;
      return daysBetween(new Date(l.createdAt), new Date(l.updatedAt));
    }).filter(Boolean);

    return {
      manager,
      totalLeads: mLeads.length,
      won: won.length,
      lost: lost.length,
      active: mLeads.length - won.length - lost.length,
      conversionRate: (won.length + lost.length) > 0
        ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
      totalRevenue: budgets.length > 0 ? Math.round(ss.sum(budgets)) : 0,
      avgDealSize: budgets.length > 0 ? Math.round(ss.mean(budgets)) : null,
      medianCycleDays: cycleDays.length > 0 ? ss.median(cycleDays) : null,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// ─── 14. Win/Loss analysis ───

export function winLossAnalysis(leads, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const won = leads.filter(l => sc.won.includes(l.statusKey));
  const lost = leads.filter(l => sc.lost.includes(l.statusKey));

  const getBudgets = (arr) => arr.map(l => {
    const cf = l.customFields || {};
    return Number(resolveField(cf, 'budget', fm) || 0);
  }).filter(b => b > 0);

  const wonBudgets = getBudgets(won);
  const lostBudgets = getBudgets(lost);

  const bySource = {};
  const byType = {};
  for (const l of [...won, ...lost]) {
    const cf = l.customFields || {};
    const source = resolveField(cf, 'source', fm) || 'Неизвестно';
    const objType = resolveField(cf, 'objectType', fm) || 'Неизвестно';
    const isWon = sc.won.includes(l.statusKey);

    if (!bySource[source]) bySource[source] = { won: 0, lost: 0 };
    bySource[source][isWon ? 'won' : 'lost']++;

    if (!byType[objType]) byType[objType] = { won: 0, lost: 0 };
    byType[objType][isWon ? 'won' : 'lost']++;
  }

  const sourceConversion = Object.entries(bySource).map(([source, { won: w, lost: lo }]) => ({
    source, won: w, lost: lo, rate: Math.round((w / (w + lo)) * 100),
  })).sort((a, b) => b.rate - a.rate);

  const typeConversion = Object.entries(byType).map(([type, { won: w, lost: lo }]) => ({
    type, won: w, lost: lo, rate: Math.round((w / (w + lo)) * 100),
  })).sort((a, b) => b.rate - a.rate);

  return {
    wonCount: won.length,
    lostCount: lost.length,
    overallRate: (won.length + lost.length) > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    avgWonBudget: wonBudgets.length > 0 ? Math.round(ss.mean(wonBudgets)) : null,
    avgLostBudget: lostBudgets.length > 0 ? Math.round(ss.mean(lostBudgets)) : null,
    medianWonBudget: wonBudgets.length > 0 ? ss.median(wonBudgets) : null,
    medianLostBudget: lostBudgets.length > 0 ? ss.median(lostBudgets) : null,
    sourceConversion,
    typeConversion,
  };
}

// ─── 15. Conversion-by-period ───

export function conversionByPeriod(leads, period = 'month', { fieldMap, stageConfig } = {}) {
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const buckets = {};
  for (const l of leads) {
    if (!l.createdAt) continue;
    if (!sc.won.includes(l.statusKey) && !sc.lost.includes(l.statusKey)) continue;
    const d = new Date(l.createdAt);
    const key = period === 'quarter'
      ? `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) buckets[key] = { won: 0, lost: 0 };
    if (sc.won.includes(l.statusKey)) buckets[key].won++;
    else buckets[key].lost++;
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, { won: w, lost: lo }]) => ({
      period: p,
      won: w,
      lost: lo,
      rate: (w + lo) > 0 ? Math.round((w / (w + lo)) * 100) : null,
    }));
}

// ─── Full analytics bundle ───

export function buildAnalyticsBundle(leads, { fieldMap, stageConfig } = {}) {
  const fm = fieldMap || DEFAULT_CRM_FIELD_MAP;
  const sc = stageConfig || DEFAULT_CRM_STAGES;
  const cfg = { fieldMap: fm, stageConfig: sc };

  if (!leads || leads.length === 0) {
    return {
      empty: true,
      conversion: [], velocity: [], scores: [],
      forecast: { totalRaw: 0, totalWeighted: 0, byStage: [] },
      anomalies: [], creationTrend: { buckets: [], regression: { slope: 0, intercept: 0, r2: 0 }, points: [] },
      cohorts: [], managerKPI: [], winLoss: null, segments: null,
      conversionByPeriod: [], revenueForecast: null,
    };
  }

  const scores = scoreAllLeads(leads, cfg);
  const creationTrend = calcCreationTrend(leads, 8, cfg);

  let revenueForecast = null;
  const monthlyBuckets = buildMonthlyRevenueSeries(leads, 6, fm);
  if (monthlyBuckets.length >= 4) {
    revenueForecast = forecastTimeSeries(monthlyBuckets, 3);
  }

  return {
    empty: false,
    conversion: calcConversionRates(leads, cfg),
    velocity: calcVelocity(leads, cfg),
    scores,
    forecast: forecastRevenue(leads, cfg),
    anomalies: detectAnomalies(leads, cfg),
    creationTrend,
    cohorts: cohortAnalysis(leads, 'month', cfg),
    managerKPI: managerPerformance(leads, cfg),
    winLoss: winLossAnalysis(leads, cfg),
    segments: segmentLeads(leads, 4, cfg),
    conversionByPeriod: conversionByPeriod(leads, 'month', cfg),
    revenueForecast,
  };
}

function buildMonthlyRevenueSeries(leads, months = 6, fm = DEFAULT_CRM_FIELD_MAP) {
  const now = new Date();
  const buckets = Array.from({ length: months }, () => 0);
  for (const l of leads) {
    if (!l.createdAt) continue;
    const d = new Date(l.createdAt);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months) {
      const cf = l.customFields || {};
      const budget = Number(resolveField(cf, 'budget', fm) || 0);
      buckets[months - 1 - monthsAgo] += budget;
    }
  }
  return buckets;
}
