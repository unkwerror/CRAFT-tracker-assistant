/**
 * CRM Analytics Engine — lightweight ML / statistical methods.
 * Pure JS, no external dependencies.
 */

const STAGE_ORDER = ['newLead', 'qualification', 'proposal', 'negotiation', 'contract', 'projectOpened'];
const STAGE_LABELS = {
  newLead: 'Новый лид', qualification: 'Квалификация', proposal: 'КП отправлено',
  negotiation: 'Переговоры', contract: 'Договор', projectOpened: 'Проект открыт',
};

const PIPELINE_WEIGHTS = {
  newLead: 0.05, qualification: 0.10, proposal: 0.20,
  negotiation: 0.50, contract: 0.80, projectOpened: 1.0,
};

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

// ─── Conversion rates between stages ───

export function calcConversionRates(leads) {
  const byStage = {};
  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    byStage[sk] = (byStage[sk] || 0) + 1;
  }

  const cumulative = {};
  let running = 0;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    running += byStage[STAGE_ORDER[i]] || 0;
    cumulative[STAGE_ORDER[i]] = running;
  }

  const rates = [];
  for (let i = 1; i < STAGE_ORDER.length; i++) {
    const from = STAGE_ORDER[i - 1];
    const to = STAGE_ORDER[i];
    const fromCount = cumulative[from] || 0;
    const toCount = cumulative[to] || 0;
    rates.push({
      from, to,
      fromLabel: STAGE_LABELS[from], toLabel: STAGE_LABELS[to],
      fromCount, toCount,
      rate: fromCount > 0 ? toCount / fromCount : 0,
    });
  }
  return rates;
}

// ─── Velocity: median days in each status ───

export function calcVelocity(leads) {
  const now = new Date();
  const daysByStage = {};

  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    if (!l.createdAt) continue;
    const created = new Date(l.createdAt);
    const updated = l.updatedAt ? new Date(l.updatedAt) : now;
    const days = Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)));
    if (!daysByStage[sk]) daysByStage[sk] = [];
    daysByStage[sk].push(days);
  }

  return STAGE_ORDER.map(sk => {
    const arr = daysByStage[sk] || [];
    return {
      stage: sk,
      label: STAGE_LABELS[sk],
      median: median(arr),
      avg: arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null,
      count: arr.length,
    };
  }).filter(v => v.count > 0);
}

// ─── Lead scoring 0–100 ───

function findField(cf, ...keys) {
  if (!cf) return undefined;
  for (const k of keys) {
    if (cf[k] !== undefined && cf[k] !== null) return cf[k];
  }
  return undefined;
}

export function scoreLead(lead) {
  const cf = lead.customFields || {};
  const budget = findField(cf, 'budgetKP', 'Бюджет КП', 'contractSum', 'Сумма договора');
  const source = findField(cf, 'leadSource', 'Источник лида');
  const objType = findField(cf, 'objectType', 'Тип объекта');
  const sk = lead.statusKey || 'newLead';
  const createdAt = lead.createdAt ? new Date(lead.createdAt) : new Date();
  const ageDays = Math.max(1, Math.round((new Date() - createdAt) / (1000 * 60 * 60 * 24)));

  const budgetScore = budget ? Math.min(100, Math.round(Math.log10(Math.max(1, Number(budget))) * 20)) : 30;
  const sourceScore = SOURCE_SCORES[source] || 40;
  const typeScore = TYPE_SCORES[objType] || 40;

  const stageIdx = STAGE_ORDER.indexOf(sk);
  const stageScore = stageIdx >= 0 ? Math.round((stageIdx / (STAGE_ORDER.length - 1)) * 100) : 20;

  // Freshness: newer leads score higher (decays over 90 days)
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

export function scoreAllLeads(leads) {
  return leads.map(scoreLead).sort((a, b) => b.score - a.score);
}

// ─── Weighted pipeline forecast ───

export function forecastRevenue(leads) {
  let totalWeighted = 0;
  let totalRaw = 0;
  const byStage = {};

  for (const l of leads) {
    const sk = l.statusKey || 'unknown';
    const budget = Number(findField(l.customFields || {}, 'budgetKP', 'Бюджет КП', 'contractSum', 'Сумма договора') || 0);
    const weight = PIPELINE_WEIGHTS[sk] || 0;

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
    byStage: STAGE_ORDER.map(sk => ({
      stage: sk,
      label: STAGE_LABELS[sk],
      weight: PIPELINE_WEIGHTS[sk],
      ...( byStage[sk] || { raw: 0, weighted: 0, count: 0 }),
    })).filter(s => s.count > 0),
  };
}

// ─── Anomaly detection: Z-score for stuck leads ───

export function detectAnomalies(leads) {
  const now = new Date();
  const activeLeads = leads.filter(l =>
    l.createdAt && !['projectOpened', 'rejected'].includes(l.statusKey)
  );

  if (activeLeads.length < 3) return [];

  const ages = activeLeads.map(l => {
    const updated = l.updatedAt ? new Date(l.updatedAt) : now;
    return Math.max(1, Math.round((now - updated) / (1000 * 60 * 60 * 24)));
  });

  const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
  const stdDev = Math.sqrt(ages.reduce((a, d) => a + (d - mean) ** 2, 0) / ages.length);
  if (stdDev < 1) return [];

  return activeLeads
    .map((l, i) => ({
      key: l.key,
      summary: l.summary,
      status: l.status,
      statusKey: l.statusKey,
      daysSinceUpdate: ages[i],
      zScore: Math.round(((ages[i] - mean) / stdDev) * 100) / 100,
    }))
    .filter(a => a.zScore > 1.5)
    .sort((a, b) => b.zScore - a.zScore);
}

// ─── Week-over-week trend ───

export function calcTrend(current, previous) {
  if (!previous || previous === 0) return { delta: current, pct: null };
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  return { delta, pct };
}

// ─── Least-squares linear regression ───

export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const { x, y } of points) {
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = points.reduce((acc, { x, y }) => acc + (y - (slope * x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;

  return { slope: Math.round(slope * 100) / 100, intercept: Math.round(intercept * 100) / 100, r2 };
}

// ─── Lead creation trend (weekly buckets for regression) ───

export function calcCreationTrend(leads, weeks = 8) {
  const now = new Date();
  const buckets = Array.from({ length: weeks }, () => 0);

  for (const l of leads) {
    if (!l.createdAt) continue;
    const age = (now - new Date(l.createdAt)) / (1000 * 60 * 60 * 24 * 7);
    const idx = Math.min(weeks - 1, Math.floor(age));
    if (idx >= 0 && idx < weeks) buckets[weeks - 1 - idx]++;
  }

  const points = buckets.map((y, i) => ({ x: i, y }));
  const reg = linearRegression(points);

  return { buckets, regression: reg, points };
}

// ─── Full analytics bundle ───

export function buildAnalyticsBundle(leads) {
  if (!leads || leads.length === 0) {
    return {
      empty: true,
      conversion: [],
      velocity: [],
      scores: [],
      forecast: { totalRaw: 0, totalWeighted: 0, byStage: [] },
      anomalies: [],
      creationTrend: { buckets: [], regression: { slope: 0, intercept: 0, r2: 0 }, points: [] },
    };
  }

  return {
    empty: false,
    conversion: calcConversionRates(leads),
    velocity: calcVelocity(leads),
    scores: scoreAllLeads(leads),
    forecast: forecastRevenue(leads),
    anomalies: detectAnomalies(leads),
    creationTrend: calcCreationTrend(leads),
  };
}

// ─── Helpers ───

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
