/**
 * Клиент API Яндекс Трекера v2
 * @see https://yandex.ru/dev/tracker/doc/ru/api-ref/about-api
 */

const TRACKER_API = 'https://api.tracker.yandex.net/v2';

// ─── Tiered TTL cache with granular invalidation + request deduplication ───
const _cache = new Map();
const _inflight = new Map();

const TTL = {
  statuses: 300_000,   // 5 min — queue statuses rarely change
  components: 300_000, // 5 min
  search: 60_000,      // 1 min — task lists
  issue: 45_000,       // 45s — single issue
  changelog: 30_000,   // 30s
  comments: 30_000,    // 30s
  default: 60_000,     // 1 min
};

function resolveTTL(path) {
  if (path.includes('/statuses')) return TTL.statuses;
  if (path.includes('/components')) return TTL.components;
  if (path.includes('_search') || path.includes('_count')) return TTL.search;
  if (path.includes('/changelog')) return TTL.changelog;
  if (path.includes('/comments')) return TTL.comments;
  if (/\/issues\/[A-Z]+-\d+$/.test(path)) return TTL.issue;
  return TTL.default;
}

function cacheKey(token, method, path) {
  return `${token.slice(-8)}:${method}:${path}`;
}

function getCached(key, ttl) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 500) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
}

export function invalidateCache(token, issueKey) {
  const prefix = token.slice(-8) + ':';
  if (issueKey) {
    for (const k of _cache.keys()) {
      if (k.startsWith(prefix) && (k.includes(issueKey) || k.includes('_search') || k.includes('_count'))) {
        _cache.delete(k);
      }
    }
  } else {
    for (const k of _cache.keys()) {
      if (k.startsWith(prefix)) _cache.delete(k);
    }
  }
}

const STANDARD_ISSUE_FIELDS = new Set([
  'self', 'id', 'key', 'version', 'summary', 'description',
  'status', 'priority', 'type', 'createdAt', 'updatedAt', 'resolvedAt',
  'deadline', 'createdBy', 'updatedBy', 'resolvedBy', 'assignee',
  'queue', 'components', 'tags', 'followers', 'access', 'unique',
  'favorite', 'sprint', 'project', 'parent', 'aliases',
  'previousStatus', 'previousStatusLastAssignee', 'previousQueue',
  'statusStartTime', 'boards', 'start', 'end', 'estimation',
  'storyPoints', 'lastCommentUpdatedAt', 'pendingReplyFrom',
  'commentWithoutExternalMessageCount', 'commentWithExternalMessageCount',
  'votes', 'worklogs', 'links', 'attachments', 'transitions',
  'emailCreatedBy', 'emailTo', 'emailFrom', 'sla', 'possibleSpam',
  'customFields', 'checklistDone', 'checklistTotal',
]);

function normalizeFieldValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.map(normalizeFieldValue).filter((v) => v != null && v !== '').join(', ');
  }
  if (typeof value === 'object') {
    if (value.display != null) return value.display;
    if (value.name != null) return value.name;
    if (value.key != null) return value.key;
    if (value.value != null) return normalizeFieldValue(value.value);
    return JSON.stringify(value);
  }
  return value;
}

export function normalizeIssue(issue) {
  const customFields = {};

  // Source 1: explicit customFields array (some endpoints return it)
  if (Array.isArray(issue.customFields)) {
    for (const f of issue.customFields) {
      const name = f.name || f.id;
      const val = normalizeFieldValue(f.value);
      if (val != null) {
        customFields[f.id] = val;
        if (name && name !== f.id) {
          customFields[name] = val;
          customFields[String(name).toLowerCase()] = val;
        }
      }
    }
  }

  // Source 2: top-level properties that aren't standard fields
  // Yandex Tracker v2 returns local queue fields as top-level issue keys
  for (const [k, v] of Object.entries(issue)) {
    if (STANDARD_ISSUE_FIELDS.has(k) || v == null) continue;
    if (typeof v === 'function') continue;
    const val = normalizeFieldValue(v);
    if (val != null && val !== '' && !customFields[k]) {
      customFields[k] = val;
    }
  }

  return {
    key: issue.key,
    summary: issue.summary,
    description: issue.description ?? null,
    status: issue.status?.display,
    statusKey: issue.status?.key,
    priority: issue.priority?.display,
    priorityKey: issue.priority?.key,
    type: issue.type?.display,
    typeKey: issue.type?.key,
    deadline: issue.deadline ?? null,
    assignee: issue.assignee?.display,
    assigneeId: issue.assignee?.id,
    queue: issue.queue?.key,
    components: (issue.components || []).map((c) => c.display || c.name || c),
    tags: issue.tags || [],
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt ?? null,
    createdBy: issue.createdBy?.display,
    sprint: issue.sprint ? (Array.isArray(issue.sprint) ? issue.sprint.map(s => s.display || s.name) : [issue.sprint.display || issue.sprint.name]) : [],
    storyPoints: issue.storyPoints ?? null,
    estimation: issue.estimation ?? null,
    customFields,
    url: `https://tracker.yandex.ru/${issue.key}`,
  };
}

export class TrackerClient {
  constructor(oauthToken, orgId) {
    this.token = oauthToken;
    this.orgId = orgId;
    this.enabled = !!(oauthToken && orgId);
  }

  async request(method, path, body = null, { useCache = true, retries = 2 } = {}) {
    if (!this.enabled) return null;

    const bodyStr = body ? JSON.stringify(body) : '';
    const ck = cacheKey(this.token, method, path + bodyStr);
    const ttl = resolveTTL(path);
    const isCacheable = useCache && (method === 'GET' || (method === 'POST' && (path.includes('_search') || path.includes('_count'))));

    if (isCacheable) {
      const cached = getCached(ck, ttl);
      if (cached) return cached;
    }

    if (isCacheable && _inflight.has(ck)) {
      return _inflight.get(ck);
    }

    const doFetch = async () => {
      const url = `${TRACKER_API}${path}`;
      const headers = {
        'Authorization': `OAuth ${this.token}`,
        'X-Org-ID': this.orgId,
      };
      if (body) headers['Content-Type'] = 'application/json';

      for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, {
          method,
          headers,
          body: bodyStr || null,
        });

        if (res.status === 429) {
          if (attempt < retries) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw new Error(`Tracker API 429: слишком много запросов, попробуйте через минуту`);
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Tracker API ${res.status}: ${text}`);
        }

        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : null;

        if (isCacheable) setCache(ck, data);
        return data;
      }
    };

    if (isCacheable) {
      const promise = doFetch().finally(() => _inflight.delete(ck));
      _inflight.set(ck, promise);
      return promise;
    }

    return doFetch();
  }

  // ─── Текущий пользователь ───

  async getMyself() {
    return this.request('GET', '/myself');
  }

  // ─── Поиск ───

  async searchIssues(filter, page = 1, perPage = 50, { query: ql, expand, order } = {}) {
    if (!this.enabled) return [];
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (expand) params.set('expand', expand);
    if (order) params.set('order', order);

    const body = {};
    if (filter && Object.keys(filter).length > 0) body.filter = filter;
    if (ql) body.query = ql;

    const data = await this.request(
      'POST',
      `/issues/_search?${params}`,
      Object.keys(body).length > 0 ? body : { filter: filter || {} },
    );
    return Array.isArray(data) ? data : (data?.issues || []);
  }

  // ─── Мои задачи ───

  async getMyTasks(status = null) {
    const filter = { assignee: 'me' };
    if (status) filter.status = status;
    const direct = await this.searchIssues(filter, 1, 100);
    if (direct.length > 0) return direct;

    // Fallback #1: resolve current user explicitly
    try {
      const me = await this.getMyself();
      const candidates = [me?.uid, me?.login, me?.id].filter(Boolean);
      for (const assignee of candidates) {
        const altFilter = { assignee };
        if (status) altFilter.status = status;
        const alt = await this.searchIssues(altFilter, 1, 100);
        if (alt.length > 0) return alt;
      }
    } catch {
      // proceed to query fallback
    }

    // Fallback #2: query language with me()
    try {
      const ql = status
        ? `Assignee: me() AND Status: "${status}"`
        : 'Assignee: me()';
      return await this.searchIssues({}, 1, 100, { query: ql });
    } catch {
      return [];
    }
  }

  // ─── Задачи очереди ───

  async getQueueTasks(queueKey, options = {}) {
    const { assigneeMe = false, status = null, perPage = 100, allPages = true } = options;
    const filter = { queue: queueKey };
    if (assigneeMe) filter.assignee = 'me';
    if (status) filter.status = status;

    if (!allPages) {
      return this.searchIssues(filter, 1, perPage);
    }

    const MAX_PAGES = 10;
    let page = 1;
    let all = [];
    while (page <= MAX_PAGES) {
      const batch = await this.searchIssues(filter, page, perPage);
      all = all.concat(batch);
      if (batch.length < perPage) break;
      page++;
    }
    return all;
  }

  // ─── CRUD задач ───

  async getIssue(issueKey) {
    return this.request('GET', `/issues/${issueKey}`);
  }

  async createIssue({ queue, summary, description, type, priority, assignee, fields }) {
    const body = { queue, summary };
    if (description) body.description = description;
    if (type) body.type = type;
    if (priority) body.priority = priority;
    if (assignee) body.assignee = assignee;
    if (fields && typeof fields === 'object') Object.assign(body, fields);
    invalidateCache(this.token, null);
    return this.request('POST', '/issues', body, { useCache: false });
  }

  async updateIssue(issueKey, data) {
    invalidateCache(this.token, issueKey);
    return this.request('PATCH', `/issues/${issueKey}`, data, { useCache: false });
  }

  // ─── Трудозатраты / Связи / Комментарии ───

  async getWorklogs(issueKey) {
    return this.request('GET', `/issues/${issueKey}/worklogs`);
  }

  async getLinks(issueKey) {
    return this.request('GET', `/issues/${issueKey}/links`);
  }

  async getComments(issueKey) {
    return this.request('GET', `/issues/${issueKey}/comments`);
  }

  // ─── Очереди ───

  async getComponents(queueKey) {
    return this.request('GET', `/queues/${queueKey}/components`);
  }

  async getQueueStatuses(queueKey) {
    try {
      const data = await this.request('GET', `/queues/${queueKey}/statuses`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // ─── Переходы (transitions) ───

  async getIssueTransitions(issueKey) {
    try {
      const data = await this.request('GET', `/issues/${issueKey}/transitions`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async getTransitions(issueKey) {
    return this.getIssueTransitions(issueKey);
  }

  async executeTransition(issueKey, transitionId, comment = null) {
    const body = comment ? { comment } : undefined;
    invalidateCache(this.token, issueKey);
    return this.request(
      'POST',
      `/issues/${issueKey}/transitions/${transitionId}/_execute`,
      body,
      { useCache: false },
    );
  }

  // ─── Комментарии (CRM Activity Log) ───

  async addComment(issueKey, text, summonees = []) {
    const body = { text };
    if (summonees.length > 0) body.summonees = summonees;
    invalidateCache(this.token, issueKey);
    return this.request('POST', `/issues/${issueKey}/comments`, body, { useCache: false });
  }

  async updateComment(issueKey, commentId, text) {
    invalidateCache(this.token, issueKey);
    return this.request('PATCH', `/issues/${issueKey}/comments/${commentId}`, { text }, { useCache: false });
  }

  async deleteComment(issueKey, commentId) {
    invalidateCache(this.token, issueKey);
    return this.request('DELETE', `/issues/${issueKey}/comments/${commentId}`, null, { useCache: false });
  }

  // ─── Changelog (точная velocity по стадиям) ───

  async getChangelog(issueKey, { field, perPage = 50, id: cursorId } = {}) {
    let path = `/issues/${issueKey}/changelog?perPage=${perPage}`;
    if (field) path += `&field=${encodeURIComponent(field)}`;
    if (cursorId) path += `&id=${cursorId}`;
    const data = await this.request('GET', path);
    return Array.isArray(data) ? data : [];
  }

  // ─── Вложения ───

  async getAttachments(issueKey) {
    const data = await this.request('GET', `/issues/${issueKey}/attachments`);
    return Array.isArray(data) ? data : [];
  }

  async uploadAttachment(issueKey, filename, buffer, contentType = 'application/octet-stream') {
    if (!this.enabled) return null;
    const url = `${TRACKER_API}/issues/${issueKey}/attachments?filename=${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${this.token}`,
        'X-Org-ID': this.orgId,
        'Content-Type': contentType,
      },
      body: buffer,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tracker API ${res.status}: ${text}`);
    }
    invalidateCache(this.token, issueKey);
    return res.json();
  }

  async deleteAttachment(issueKey, attachmentId) {
    invalidateCache(this.token, issueKey);
    return this.request('DELETE', `/issues/${issueKey}/attachments/${attachmentId}`, null, { useCache: false });
  }

  // ─── Массовые операции ───

  async bulkUpdate(issueKeys, values) {
    invalidateCache(this.token, null);
    return this.request('POST', '/bulkchange/_update', {
      issues: issueKeys,
      values,
    }, { useCache: false });
  }

  async bulkTransition(issueKeys, transitionId) {
    invalidateCache(this.token, null);
    return this.request('POST', '/bulkchange/_transition', {
      issues: issueKeys,
      transition: transitionId,
    }, { useCache: false });
  }

  async getBulkStatus(operationId) {
    return this.request('GET', `/bulkchange/${operationId}`);
  }

  // ─── Счетчик (быстрый подсчет) ───

  async countIssues(filter) {
    if (!this.enabled) return 0;
    const data = await this.request('POST', '/issues/_count', { filter });
    return typeof data === 'number' ? data : (data?.count ?? 0);
  }

  // ─── Триггеры и автодействия ───

  async getTriggers(queueKey) {
    const data = await this.request('GET', `/queues/${queueKey}/triggers`);
    return Array.isArray(data) ? data : [];
  }

  async createTrigger(queueKey, config) {
    invalidateCache(this.token, null);
    return this.request('POST', `/queues/${queueKey}/triggers`, config, { useCache: false });
  }

  async getAutoActions(queueKey) {
    const data = await this.request('GET', `/queues/${queueKey}/autoactions`);
    return Array.isArray(data) ? data : [];
  }

  async createAutoAction(queueKey, config) {
    invalidateCache(this.token, null);
    return this.request('POST', `/queues/${queueKey}/autoactions`, config, { useCache: false });
  }

  // ─── Аудит ───

  async getTasksWithoutDeadline() {
    if (!this.enabled) return [];
    return this.searchIssues(
      { assignee: 'me' }, 1, 100,
      { query: 'Deadline: empty()' },
    );
  }

  async getStaleTasks(days = 14) {
    if (!this.enabled) return [];
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.searchIssues(
      { assignee: 'me', status: 'inProgress' }, 1, 100,
      { query: `Updated: < "${d.toISOString().split('T')[0]}"` },
    );
  }

  async getOverdueTasks() {
    if (!this.enabled) return [];
    const today = new Date().toISOString().split('T')[0];
    return this.searchIssues(
      { assignee: 'me' }, 1, 100,
      { query: `Deadline: < "${today}" AND Resolution: empty()` },
    );
  }
}
