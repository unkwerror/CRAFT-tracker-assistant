/**
 * Клиент API Яндекс Трекера v2
 * @see https://yandex.ru/dev/tracker/doc/ru/api-ref/about-api
 */

const TRACKER_API = 'https://api.tracker.yandex.net/v2';

// ─── In-memory cache (per-process, 60s TTL) ───
const _cache = new Map();
const CACHE_TTL = 60_000;

function cacheKey(token, method, path) {
  return `${token.slice(-8)}:${method}:${path}`;
}

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 200) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
}

export function invalidateCache(token) {
  const prefix = token.slice(-8) + ':';
  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k);
  }
}

export function normalizeIssue(issue) {
  const customFields = {};
  (issue.customFields || []).forEach((f) => {
    const name = f.name || f.id;
    const val = f.value?.display ?? f.value?.name ?? f.value;
    if (val != null) {
      customFields[f.id] = val;
      if (name && name !== f.id) customFields[name] = val;
    }
  });
  return {
    key: issue.key,
    summary: issue.summary,
    description: issue.description,
    status: issue.status?.display,
    statusKey: issue.status?.key,
    priority: issue.priority?.display,
    priorityKey: issue.priority?.key,
    type: issue.type?.display,
    typeKey: issue.type?.key,
    deadline: issue.deadline,
    assignee: issue.assignee?.display,
    assigneeId: issue.assignee?.id,
    queue: issue.queue?.key,
    components: (issue.components || []).map((c) => c.display),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt,
    createdBy: issue.createdBy?.display,
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

    const ck = cacheKey(this.token, method, path + (body ? JSON.stringify(body) : ''));
    if (useCache && method === 'GET') {
      const cached = getCached(ck);
      if (cached) return cached;
    }
    if (useCache && method === 'POST' && path.includes('_search')) {
      const cached = getCached(ck);
      if (cached) return cached;
    }

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
        body: body ? JSON.stringify(body) : null,
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

      if (useCache && (method === 'GET' || (method === 'POST' && path.includes('_search')))) {
        setCache(ck, data);
      }

      return data;
    }
  }

  // ─── Текущий пользователь ───

  async getMyself() {
    return this.request('GET', '/myself');
  }

  // ─── Поиск ───

  async searchIssues(filter, page = 1, perPage = 50) {
    if (!this.enabled) return [];
    const data = await this.request(
      'POST',
      `/issues/_search?page=${page}&perPage=${perPage}`,
      { filter },
    );
    return Array.isArray(data) ? data : (data?.issues || []);
  }

  // ─── Мои задачи ───

  async getMyTasks(status = null) {
    const filter = { assignee: 'me' };
    if (status) filter.status = status;
    return this.searchIssues(filter);
  }

  // ─── Задачи очереди ───

  async getQueueTasks(queueKey, options = {}) {
    const { assigneeMe = false, status = null, page = 1, perPage = 100 } = options;
    const filter = { queue: queueKey };
    if (assigneeMe) filter.assignee = 'me';
    if (status) filter.status = status;
    return this.searchIssues(filter, page, perPage);
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
    invalidateCache(this.token);
    return this.request('POST', '/issues', body, { useCache: false });
  }

  async updateIssue(issueKey, data) {
    invalidateCache(this.token);
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
    invalidateCache(this.token);
    return this.request(
      'POST',
      `/issues/${issueKey}/transitions/${transitionId}/_execute`,
      body,
      { useCache: false },
    );
  }

  // ─── Аудит ───

  async getTasksWithoutDeadline() {
    if (!this.enabled) return [];
    const data = await this.request('POST', '/issues/_search?perPage=50', {
      filter: { assignee: 'me' },
      query: 'Deadline: empty()',
    });
    return Array.isArray(data) ? data : (data?.issues || []);
  }

  async getStaleTasks(days = 14) {
    if (!this.enabled) return [];
    const d = new Date();
    d.setDate(d.getDate() - days);
    const data = await this.request('POST', '/issues/_search?perPage=50', {
      filter: { assignee: 'me', status: 'inProgress' },
      query: `Updated: < "${d.toISOString().split('T')[0]}"`,
    });
    return Array.isArray(data) ? data : (data?.issues || []);
  }

  async getOverdueTasks() {
    if (!this.enabled) return [];
    const today = new Date().toISOString().split('T')[0];
    const data = await this.request('POST', '/issues/_search?perPage=50', {
      filter: { assignee: 'me' },
      query: `Deadline: < "${today}" AND Resolution: empty()`,
    });
    return Array.isArray(data) ? data : (data?.issues || []);
  }
}
