/**
 * Клиент API Яндекс Трекера v2
 * @see https://yandex.ru/dev/tracker/doc/ru/api-ref/about-api
 */

const TRACKER_API = 'https://api.tracker.yandex.net';
const TRACKER_API_V2 = `${TRACKER_API}/v2`;
const TRACKER_API_V3 = `${TRACKER_API}/v3`;

const TTL = {
  statuses: 300_000,     // 5 min — queue statuses rarely change
  components: 300_000,   // 5 min
  localFields: 300_000,  // 5 min
  projects: 300_000,     // 5 min
  boards: 300_000,       // 5 min
  entities: 300_000,     // 5 min
  search: 60_000,        // 1 min — task lists
  issue: 45_000,         // 45s — single issue
  changelog: 30_000,     // 30s
  comments: 30_000,      // 30s
  default: 60_000,       // 1 min
};

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

// ─── Tiered TTL cache with granular invalidation + request deduplication ───
const _cache = new Map();
const _inflight = new Map();

function resolveTTL(path = '') {
  if (path.includes('/statuses')) return TTL.statuses;
  if (path.includes('/components')) return TTL.components;
  if (path.includes('/localFields')) return TTL.localFields;
  if (path.includes('/projects')) return TTL.projects;
  if (path.includes('/boards')) return TTL.boards;
  if (path.includes('/entities')) return TTL.entities;
  if (path.includes('_search') || path.includes('_count')) return TTL.search;
  if (path.includes('/changelog')) return TTL.changelog;
  if (path.includes('/comments')) return TTL.comments;
  if (/\/issues\/[A-Z0-9_]+-\d+(\?.*)?$/.test(path)) return TTL.issue;
  return TTL.default;
}

function cacheKey(token, method, path, body = '', apiVersion = 'v2') {
  const tokenSuffix = token ? token.slice(-8) : 'no-token';
  return `${tokenSuffix}:${apiVersion}:${method}:${path}:${body}`;
}

function getCached(key, ttl) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 500) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
}

function invalidateCache(token, issueKey) {
  if (!token) return;
  const prefix = `${token.slice(-8)}:`;

  if (issueKey) {
    for (const k of _cache.keys()) {
      if (k.startsWith(prefix) && (k.includes(issueKey) || k.includes('_search') || k.includes('_count'))) {
        _cache.delete(k);
      }
    }
    return;
  }

  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k);
  }
}

function normalizeFieldValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value
      .map(normalizeFieldValue)
      .filter((v) => v != null && v !== '')
      .join(', ');
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

function normalizeIssue(issue) {
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
    sprint: issue.sprint
      ? (Array.isArray(issue.sprint) ? issue.sprint.map((s) => s.display || s.name) : [issue.sprint.display || issue.sprint.name])
      : [],
    storyPoints: issue.storyPoints ?? null,
    estimation: issue.estimation ?? null,
    customFields,
    transitions: Array.isArray(issue.transitions) ? issue.transitions : [],
    url: `https://tracker.yandex.ru/${issue.key}`,
  };
}

class BaseService {
  constructor(client) {
    this.client = client;
  }

  request(method, path, body = null, options = {}) {
    return this.client.request(method, path, body, options);
  }

  resolveTTL(path) {
    return resolveTTL(path);
  }

  buildPagedPath(path, page, perPage, queryParams = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(normalizedPath, 'https://tracker.local');

    for (const [k, v] of Object.entries(queryParams)) {
      if (v == null || v === '') continue;
      url.searchParams.set(k, String(v));
    }

    url.searchParams.set('page', String(page));
    url.searchParams.set('perPage', String(perPage));
    return `${url.pathname}${url.search}`;
  }

  extractList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.issues)) return data.issues;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.values)) return data.values;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }

  async paginateAll(method, path, body = null, { perPage = 100, maxPages = 10, startPage = 1, queryParams = {}, useCache = true, retries = 2, apiVersion = 'v2', extractor } = {}) {
    if (!this.client.enabled) return [];

    const results = [];
    const lastPage = startPage + maxPages - 1;
    let page = startPage;

    while (page <= lastPage) {
      const pagedPath = this.buildPagedPath(path, page, perPage, queryParams);
      const data = await this.request(method, pagedPath, body, { useCache, retries, apiVersion });
      const batch = extractor ? extractor(data) : this.extractList(data);

      if (!Array.isArray(batch) || batch.length === 0) break;
      results.push(...batch);

      if (batch.length < perPage) break;
      page += 1;
    }

    return results;
  }
}

class AttachmentService extends BaseService {
  async list(issueKey) {
    const data = await this.request('GET', `/issues/${issueKey}/attachments`);
    return Array.isArray(data) ? data : [];
  }

  async upload(issueKey, filename, buffer, contentType = 'application/octet-stream') {
    if (!this.client.enabled) return null;

    const url = `${this.client.getApiBase('v2')}/issues/${issueKey}/attachments?filename=${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${this.client.token}`,
        'X-Org-ID': this.client.orgId,
        'Content-Type': contentType,
      },
      body: buffer,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tracker API ${res.status}: ${text}`);
    }

    invalidateCache(this.client.token, issueKey);
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : null;
  }

  async delete(issueKey, attachmentId) {
    invalidateCache(this.client.token, issueKey);
    return this.request('DELETE', `/issues/${issueKey}/attachments/${attachmentId}`, null, { useCache: false });
  }
}

class BoardService extends BaseService {
  async list(options = {}) {
    if (!this.client.enabled) return [];
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options || {})) {
      if (v == null || v === '') continue;
      params.set(k, String(v));
    }

    const query = params.toString();
    const data = await this.request('GET', query ? `/boards?${query}` : '/boards');
    return this.extractList(data);
  }

  async get(boardId) {
    return this.request('GET', `/boards/${boardId}`);
  }

  async getSprints(boardId) {
    const data = await this.request('GET', `/boards/${boardId}/sprints`);
    return this.extractList(data);
  }
}

class BulkService extends BaseService {
  async update(issueKeys, values) {
    invalidateCache(this.client.token, null);
    return this.request('POST', '/bulkchange/_update', {
      issues: issueKeys,
      values,
    }, { useCache: false });
  }

  async transition(issueKeys, transitionId) {
    invalidateCache(this.client.token, null);
    return this.request('POST', '/bulkchange/_transition', {
      issues: issueKeys,
      transition: transitionId,
    }, { useCache: false });
  }

  async getStatus(operationId) {
    return this.request('GET', `/bulkchange/${operationId}`);
  }
}

class ChangelogService extends BaseService {
  async list(issueKey, { field, perPage = 50, id: cursorId } = {}) {
    const params = new URLSearchParams({ perPage: String(perPage) });
    if (field) params.set('field', field);
    if (cursorId) params.set('id', cursorId);
    const data = await this.request('GET', `/issues/${issueKey}/changelog?${params.toString()}`);
    return Array.isArray(data) ? data : [];
  }
}

class CommentService extends BaseService {
  async list(issueKey) {
    return this.request('GET', `/issues/${issueKey}/comments`);
  }

  async add(issueKey, text, summonees = []) {
    const body = { text };
    if (Array.isArray(summonees) && summonees.length > 0) {
      body.summonees = summonees;
    }
    invalidateCache(this.client.token, issueKey);
    return this.request('POST', `/issues/${issueKey}/comments`, body, { useCache: false });
  }

  async update(issueKey, commentId, text) {
    invalidateCache(this.client.token, issueKey);
    return this.request('PATCH', `/issues/${issueKey}/comments/${commentId}`, { text }, { useCache: false });
  }

  async delete(issueKey, commentId) {
    invalidateCache(this.client.token, issueKey);
    return this.request('DELETE', `/issues/${issueKey}/comments/${commentId}`, null, { useCache: false });
  }
}

class EntityService extends BaseService {
  normalizeEntityType(entityType) {
    return String(entityType || '').trim().toLowerCase();
  }

  isEndpointUnavailable(error) {
    return /Tracker API (403|404):/i.test(String(error?.message || error));
  }

  async requestEntity(method, path, body = null, options = {}) {
    if (!this.client.v3Enabled) {
      return this.request(method, path, body, { ...options, apiVersion: 'v2' });
    }

    try {
      return await this.request(method, path, body, { ...options, apiVersion: 'v3' });
    } catch (error) {
      if (!this.isEndpointUnavailable(error)) throw error;
      return this.request(method, path, body, { ...options, apiVersion: 'v2' });
    }
  }

  async list(entityType, { page, perPage = 100, maxPages = 10 } = {}) {
    if (!this.client.enabled) return [];

    const type = this.normalizeEntityType(entityType);
    if (!type) return [];
    const body = { filter: {} };

    try {
      if (page != null) {
        const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
        const data = await this.requestEntity('POST', `/entities/${type}/_search?${params.toString()}`, body);
        return this.extractList(data);
      }

      // Uses shared autopagination for consistent search behavior.
      const preferredApiVersion = this.client.v3Enabled ? 'v3' : 'v2';
      try {
        return await this.paginateAll('POST', `/entities/${type}/_search`, body, {
          perPage,
          maxPages,
          apiVersion: preferredApiVersion,
          extractor: (data) => this.extractList(data),
        });
      } catch (error) {
        if (!(preferredApiVersion === 'v3' && this.isEndpointUnavailable(error))) throw error;
        return this.paginateAll('POST', `/entities/${type}/_search`, body, {
          perPage,
          maxPages,
          apiVersion: 'v2',
          extractor: (data) => this.extractList(data),
        });
      }
    } catch (error) {
      if (!this.isEndpointUnavailable(error)) throw error;
      if (type !== 'project' && type !== 'portfolio') return [];

      const fallbackOptions = { perPage };
      if (page != null) {
        fallbackOptions.page = page;
      } else {
        fallbackOptions.allPages = true;
        fallbackOptions.maxPages = maxPages;
      }
      return this.client.projects.list(fallbackOptions);
    }
  }

  async get(entityType, entityId) {
    if (!this.client.enabled) return null;

    const type = this.normalizeEntityType(entityType);
    if (!type || !entityId) return null;

    try {
      return await this.requestEntity('GET', `/entities/${type}/${entityId}`);
    } catch (error) {
      if (!this.isEndpointUnavailable(error)) throw error;
      if (type === 'project' || type === 'portfolio') {
        return this.client.projects.get(entityId);
      }
      return null;
    }
  }

  async getFields(entityType) {
    if (!this.client.enabled) return [];

    const type = this.normalizeEntityType(entityType);
    if (!type) return [];

    try {
      const data = await this.requestEntity('GET', `/entities/${type}/fields`);
      return this.extractList(data);
    } catch (error) {
      if (!this.isEndpointUnavailable(error)) throw error;
      return [];
    }
  }
}

class IssueService extends BaseService {
  buildSearchBody(filter, query) {
    const body = {};
    if (filter && Object.keys(filter).length > 0) body.filter = filter;
    if (query) body.query = query;
    return Object.keys(body).length > 0 ? body : { filter: filter || {} };
  }

  async search(filter, page = 1, perPage = 50, { query: ql, expand, order, allPages = false, maxPages = 10 } = {}) {
    if (!this.client.enabled) return [];

    const body = this.buildSearchBody(filter, ql);

    if (allPages) {
      return this.paginateAll('POST', '/issues/_search', body, {
        perPage,
        maxPages,
        queryParams: { expand, order },
        extractor: (data) => (Array.isArray(data) ? data : (data?.issues || [])),
      });
    }

    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });
    if (expand) params.set('expand', expand);
    if (order) params.set('order', order);

    const data = await this.request('POST', `/issues/_search?${params.toString()}`, body);
    return Array.isArray(data) ? data : (data?.issues || []);
  }

  async get(issueKey, { expand = 'transitions' } = {}) {
    const params = new URLSearchParams();
    if (expand) params.set('expand', expand);
    const query = params.toString();
    const path = query ? `/issues/${issueKey}?${query}` : `/issues/${issueKey}`;
    return this.request('GET', path);
  }

  async create({ queue, summary, description, type, priority, assignee, fields }) {
    const body = { queue, summary };
    if (description) body.description = description;
    if (type) body.type = type;
    if (priority) body.priority = priority;
    if (assignee) body.assignee = assignee;
    if (fields && typeof fields === 'object') Object.assign(body, fields);

    invalidateCache(this.client.token, null);
    return this.request('POST', '/issues', body, { useCache: false });
  }

  async update(issueKey, data) {
    invalidateCache(this.client.token, issueKey);
    return this.request('PATCH', `/issues/${issueKey}`, data, { useCache: false });
  }

  async count(filter) {
    if (!this.client.enabled) return 0;
    const data = await this.request('POST', '/issues/_count', { filter });
    return typeof data === 'number' ? data : (data?.count ?? 0);
  }

  async getMyTasks(status = null) {
    const filter = { assignee: 'me' };
    if (status) filter.status = status;

    const direct = await this.search(filter, 1, 100);
    if (direct.length > 0) return direct;

    // Fallback #1: resolve current user explicitly
    try {
      const me = await this.client.getMyself();
      const candidates = [me?.uid, me?.login, me?.id].filter(Boolean);
      for (const assignee of candidates) {
        const altFilter = { assignee };
        if (status) altFilter.status = status;
        const alt = await this.search(altFilter, 1, 100);
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
      return await this.search({}, 1, 100, { query: ql });
    } catch {
      return [];
    }
  }

  async getQueueTasks(queueKey, options = {}) {
    const { assigneeMe = false, status = null, perPage = 100, allPages = true, maxPages = 10, expand, order } = options;
    const filter = { queue: queueKey };
    if (assigneeMe) filter.assignee = 'me';
    if (status) filter.status = status;

    if (!allPages) {
      return this.search(filter, 1, perPage, { expand, order });
    }

    return this.search(filter, 1, perPage, { expand, order, allPages: true, maxPages });
  }

  async getTasksWithoutDeadline() {
    if (!this.client.enabled) return [];
    return this.search(
      { assignee: 'me' }, 1, 100,
      { query: 'Deadline: empty()' },
    );
  }

  async getStaleTasks(days = 14) {
    if (!this.client.enabled) return [];
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.search(
      { assignee: 'me', status: 'inProgress' }, 1, 100,
      { query: `Updated: < "${d.toISOString().split('T')[0]}"` },
    );
  }

  async getOverdueTasks() {
    if (!this.client.enabled) return [];
    const today = new Date().toISOString().split('T')[0];
    return this.search(
      { assignee: 'me' }, 1, 100,
      { query: `Deadline: < "${today}" AND Resolution: empty()` },
    );
  }

  async getLinks(issueKey) {
    return this.request('GET', `/issues/${issueKey}/links`);
  }
}

class ProjectService extends BaseService {
  async list(options = {}) {
    if (!this.client.enabled) return [];

    const { page, perPage = 100, maxPages = 10, allPages = false, ...rest } = options || {};
    if (allPages && page == null) {
      return this.paginateAll('GET', '/projects', null, {
        perPage,
        maxPages,
        queryParams: rest,
      });
    }

    const params = new URLSearchParams();
    if (page != null) params.set('page', String(page));
    if (perPage != null) params.set('perPage', String(perPage));
    for (const [k, v] of Object.entries(rest)) {
      if (v == null || v === '') continue;
      params.set(k, String(v));
    }

    const query = params.toString();
    const data = await this.request('GET', query ? `/projects?${query}` : '/projects');
    return this.extractList(data);
  }

  async get(projectId) {
    return this.request('GET', `/projects/${projectId}`);
  }

  async getQueues(projectId) {
    const data = await this.request('GET', `/projects/${projectId}/queues`);
    return this.extractList(data);
  }
}

class QueueService extends BaseService {
  async getStatuses(queueKey) {
    try {
      const data = await this.request('GET', `/queues/${queueKey}/statuses`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async getComponents(queueKey) {
    return this.request('GET', `/queues/${queueKey}/components`);
  }

  async getLocalFields(queueKey) {
    try {
      const data = await this.request('GET', `/queues/${queueKey}/localFields`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async getInfo(queueKey) {
    return this.request('GET', `/queues/${queueKey}`);
  }

  async getTriggers(queueKey) {
    const data = await this.request('GET', `/queues/${queueKey}/triggers`);
    return Array.isArray(data) ? data : [];
  }

  async createTrigger(queueKey, config) {
    invalidateCache(this.client.token, null);
    return this.request('POST', `/queues/${queueKey}/triggers`, config, { useCache: false });
  }

  async getAutoActions(queueKey) {
    const data = await this.request('GET', `/queues/${queueKey}/autoactions`);
    return Array.isArray(data) ? data : [];
  }

  async createAutoAction(queueKey, config) {
    invalidateCache(this.client.token, null);
    return this.request('POST', `/queues/${queueKey}/autoactions`, config, { useCache: false });
  }
}

class TransitionService extends BaseService {
  async list(issueKey) {
    try {
      const data = await this.request('GET', `/issues/${issueKey}/transitions`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async execute(issueKey, transitionId, comment = null) {
    const body = comment ? { comment } : undefined;
    invalidateCache(this.client.token, issueKey);
    return this.request(
      'POST',
      `/issues/${issueKey}/transitions/${transitionId}/_execute`,
      body,
      { useCache: false },
    );
  }
}

class WorklogService extends BaseService {
  async list(issueKey) {
    return this.request('GET', `/issues/${issueKey}/worklogs`);
  }

  async add(issueKey, { start, duration, comment } = {}) {
    const body = {};
    if (start) body.start = start;
    if (duration != null) body.duration = duration;
    if (comment) body.comment = comment;

    invalidateCache(this.client.token, issueKey);
    return this.request('POST', `/issues/${issueKey}/worklogs`, body, { useCache: false });
  }
}

class TrackerClient {
  constructor(oauthToken, orgId) {
    this.token = oauthToken;
    this.orgId = orgId;
    this.enabled = !!(oauthToken && orgId);
    this.v3Enabled = process.env.TRACKER_USE_V3 === '1' || process.env.TRACKER_API_VERSION === 'v3';
    this._services = Object.create(null);
    this._baseService = new BaseService(this);
  }

  getApiBase(apiVersion = 'v2') {
    return apiVersion === 'v3' ? TRACKER_API_V3 : TRACKER_API_V2;
  }

  get attachments() {
    return this._getService('attachments', AttachmentService);
  }

  get boards() {
    return this._getService('boards', BoardService);
  }

  get bulk() {
    return this._getService('bulk', BulkService);
  }

  get changelog() {
    return this._getService('changelog', ChangelogService);
  }

  get comments() {
    return this._getService('comments', CommentService);
  }

  get entities() {
    return this._getService('entities', EntityService);
  }

  get issues() {
    return this._getService('issues', IssueService);
  }

  get projects() {
    return this._getService('projects', ProjectService);
  }

  get queues() {
    return this._getService('queues', QueueService);
  }

  get transitions() {
    return this._getService('transitions', TransitionService);
  }

  get worklogs() {
    return this._getService('worklogs', WorklogService);
  }

  _getService(key, ServiceClass) {
    if (!this._services[key]) {
      this._services[key] = new ServiceClass(this);
    }
    return this._services[key];
  }

  async request(method, path, body = null, { useCache = true, retries = 2, apiVersion = 'v2', headers = {} } = {}) {
    if (!this.enabled) return null;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const hasBody = body !== null && body !== undefined;
    const bodyStr = hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const ck = cacheKey(this.token, method, normalizedPath, bodyStr, apiVersion);
    const ttl = resolveTTL(normalizedPath);
    const isCacheable = useCache && (method === 'GET' || (method === 'POST' && (normalizedPath.includes('_search') || normalizedPath.includes('_count'))));

    if (isCacheable) {
      const cached = getCached(ck, ttl);
      if (cached) return cached;
    }

    if (isCacheable && _inflight.has(ck)) {
      return _inflight.get(ck);
    }

    const doFetch = async () => {
      const url = `${this.getApiBase(apiVersion)}${normalizedPath}`;
      const requestHeaders = {
        Authorization: `OAuth ${this.token}`,
        'X-Org-ID': this.orgId,
        ...headers,
      };
      if (hasBody && !(body instanceof FormData) && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const res = await fetch(url, {
          method,
          headers: requestHeaders,
          body: hasBody ? bodyStr : null,
        });

        if (res.status === 429) {
          if (attempt < retries) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error('Tracker API 429: слишком много запросов, попробуйте через минуту');
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Tracker API ${res.status}: ${text}`);
        }

        if (res.status === 204) {
          if (isCacheable) setCache(ck, null);
          return null;
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

  async paginateAll(method, path, body = null, options = {}) {
    return this._baseService.paginateAll(method, path, body, options);
  }

  // ─── Текущий пользователь ───

  async getMyself() {
    return this.request('GET', '/myself');
  }

  // ─── Прокси старых методов (backward compatibility) ───

  async searchIssues(filter, page = 1, perPage = 50, options = {}) {
    return this.issues.search(filter, page, perPage, options);
  }

  async getMyTasks(status = null) {
    return this.issues.getMyTasks(status);
  }

  async getQueueTasks(queueKey, options = {}) {
    return this.issues.getQueueTasks(queueKey, options);
  }

  async getIssue(issueKey, options = {}) {
    return this.issues.get(issueKey, options);
  }

  async createIssue(payload) {
    return this.issues.create(payload);
  }

  async updateIssue(issueKey, data) {
    return this.issues.update(issueKey, data);
  }

  async getWorklogs(issueKey) {
    return this.worklogs.list(issueKey);
  }

  async addWorklog(issueKey, payload) {
    return this.worklogs.add(issueKey, payload);
  }

  async getLinks(issueKey) {
    return this.issues.getLinks(issueKey);
  }

  async getComments(issueKey) {
    return this.comments.list(issueKey);
  }

  async getComponents(queueKey) {
    return this.queues.getComponents(queueKey);
  }

  async getQueueStatuses(queueKey) {
    return this.queues.getStatuses(queueKey);
  }

  async getIssueTransitions(issueKey) {
    return this.transitions.list(issueKey);
  }

  async getTransitions(issueKey) {
    return this.transitions.list(issueKey);
  }

  async executeTransition(issueKey, transitionId, comment = null) {
    return this.transitions.execute(issueKey, transitionId, comment);
  }

  async addComment(issueKey, text, summonees = []) {
    return this.comments.add(issueKey, text, summonees);
  }

  async updateComment(issueKey, commentId, text) {
    return this.comments.update(issueKey, commentId, text);
  }

  async deleteComment(issueKey, commentId) {
    return this.comments.delete(issueKey, commentId);
  }

  async getChangelog(issueKey, options = {}) {
    return this.changelog.list(issueKey, options);
  }

  async getAttachments(issueKey) {
    return this.attachments.list(issueKey);
  }

  async uploadAttachment(issueKey, filename, buffer, contentType = 'application/octet-stream') {
    return this.attachments.upload(issueKey, filename, buffer, contentType);
  }

  async deleteAttachment(issueKey, attachmentId) {
    return this.attachments.delete(issueKey, attachmentId);
  }

  async bulkUpdate(issueKeys, values) {
    return this.bulk.update(issueKeys, values);
  }

  async bulkTransition(issueKeys, transitionId) {
    return this.bulk.transition(issueKeys, transitionId);
  }

  async getBulkStatus(operationId) {
    return this.bulk.getStatus(operationId);
  }

  async countIssues(filter) {
    return this.issues.count(filter);
  }

  async getTriggers(queueKey) {
    return this.queues.getTriggers(queueKey);
  }

  async createTrigger(queueKey, config) {
    return this.queues.createTrigger(queueKey, config);
  }

  async getAutoActions(queueKey) {
    return this.queues.getAutoActions(queueKey);
  }

  async createAutoAction(queueKey, config) {
    return this.queues.createAutoAction(queueKey, config);
  }

  async getTasksWithoutDeadline() {
    return this.issues.getTasksWithoutDeadline();
  }

  async getStaleTasks(days = 14) {
    return this.issues.getStaleTasks(days);
  }

  async getOverdueTasks() {
    return this.issues.getOverdueTasks();
  }
}

export { invalidateCache, normalizeIssue, TrackerClient };
