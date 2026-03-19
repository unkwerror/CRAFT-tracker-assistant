/*
 * Клиент API Яндекс Трекера
 * Документация: https://yandex.ru/support/tracker/ru/api-ref/about-api
 *
 * Если TRACKER_ORG_ID не задан — методы возвращают пустые данные
 * (приложение работает в режиме «без Трекера»)
 */

const TRACKER_API = 'https://api.tracker.yandex.net/v3';

export class TrackerClient {
  constructor(oauthToken, orgId) {
    this.token = oauthToken;
    this.orgId = orgId;
    this.enabled = !!(oauthToken && orgId);
  }

  async request(method, path, body = null) {
    if (!this.enabled) {
      return [];
    }

    const url = `${TRACKER_API}${path}`;
    const headers = {
      'Authorization': `OAuth ${this.token}`,
      'X-Org-ID': this.orgId,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tracker API ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ─── Текущий пользователь ───
  async getMyself() {
    return this.request('GET', '/myself');
  }

  // ─── Поиск задач ───
  async searchIssues(filter, page = 1, perPage = 50) {
    return this.request('POST', `/issues/_search?page=${page}&perPage=${perPage}`, { filter });
  }

  // ─── Мои задачи ───
  async getMyTasks(status = null) {
    const filter = { assignee: 'me' };
    if (status) filter.status = status;
    return this.searchIssues(filter);
  }

  // ─── Задачи очереди ───
  async getQueueTasks(queueKey, extraFilter = {}) {
    return this.searchIssues({ queue: queueKey, ...extraFilter });
  }

  // ─── Одна задача ───
  async getIssue(issueKey) {
    return this.request('GET', `/issues/${issueKey}`);
  }

  // ─── Трудозатраты ───
  async getWorklogs(issueKey) {
    return this.request('GET', `/issues/${issueKey}/worklogs`);
  }

  // ─── Связи ───
  async getLinks(issueKey) {
    return this.request('GET', `/issues/${issueKey}/links`);
  }

  // ─── Комментарии ───
  async getComments(issueKey) {
    return this.request('GET', `/issues/${issueKey}/comments`);
  }

  // ─── Компоненты очереди ───
  async getComponents(queueKey) {
    return this.request('GET', `/queues/${queueKey}/components`);
  }

  // ═══ АУДИТ ═══

  async getTasksWithoutDeadline() {
    return this.request('POST', '/issues/_search', {
      filter: { assignee: 'me' },
      query: 'Deadline: empty()',
    });
  }

  async getStaleTasks(days = 14) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.request('POST', '/issues/_search', {
      filter: { assignee: 'me', status: 'inProgress' },
      query: `Updated: < "${d.toISOString().split('T')[0]}"`,
    });
  }

  async getOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    return this.request('POST', '/issues/_search', {
      filter: { assignee: 'me' },
      query: `Deadline: < "${today}" AND Resolution: empty()`,
    });
  }
}
