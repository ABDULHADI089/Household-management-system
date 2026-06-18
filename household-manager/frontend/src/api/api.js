// Uses Vite proxy: /api → http://localhost:3001/api
const BASE_URL = '/api';

// 15-second timeout on every request — prevents infinite hang
function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  try {
    const res = await fetchWithTimeout(url, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — is the backend running on port 3001?');
    }
    throw err;
  }
}

// Auth
export const authApi = {
  signup:        (data)  => request('/auth/signup', { method: 'POST', body: data }),
  login:         (data)  => request('/auth/login',  { method: 'POST', body: data }),
  me:            (id)    => request(`/auth/me?id=${id}`),
  updateProfile: (data)  => request('/auth/profile', { method: 'PUT', body: data }),
  status:        ()      => request('/auth/status'),
};

// Members
export const membersApi = {
  getAll:   ()         => request('/members'),
  getById:  (id)       => request(`/members/${id}`),
  create:   (data)     => request('/members', { method: 'POST', body: data }),
  update:   (id, data) => request(`/members/${id}`, { method: 'PUT', body: data }),
  delete:   (id)       => request(`/members/${id}`, { method: 'DELETE' }),
};

// Tasks
export const tasksApi = {
  getAll:      (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/tasks${qs}`);
  },
  getSummary:  ()            => request('/tasks/summary'),
  getById:     (id)          => request(`/tasks/${id}`),
  create:      (data)        => request('/tasks', { method: 'POST', body: data }),
  update:      (id, data)    => request(`/tasks/${id}`, { method: 'PUT', body: data }),
  delete:      (id)          => request(`/tasks/${id}`, { method: 'DELETE' }),
};

// Task Logs
export const taskLogsApi = {
  getAll:    (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/task-logs${qs}`);
  },
  getSummary: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/task-logs/summary${qs}`);
  },
  create:    (data)   => request('/task-logs', { method: 'POST', body: data }),
  delete:    (id)     => request(`/task-logs/${id}`, { method: 'DELETE' }),
};

// Budget / Expenses
export const expensesApi = {
  getAll:        ()         => request('/expenses'),
  getSummary:    ()         => request('/expenses/summary'),
  getMonthlyTotal: ()       => request('/expenses/monthly-total'),
  getById:       (id)       => request(`/expenses/${id}`),
  create:        (data)     => request('/expenses', { method: 'POST', body: data }),
  update:        (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: data }),
  delete:        (id)       => request(`/expenses/${id}`, { method: 'DELETE' }),
};

// Shopping
export const shoppingApi = {
  getAll:      (category) => request(`/shopping${category ? `?category=${category}` : ''}`),
  getRemaining: ()        => request('/shopping/remaining'),
  getById:     (id)       => request(`/shopping/${id}`),
  create:      (data)     => request('/shopping', { method: 'POST', body: data }),
  update:      (id, data) => request(`/shopping/${id}`, { method: 'PUT', body: data }),
  delete:      (id)       => request(`/shopping/${id}`, { method: 'DELETE' }),
};

// Events
export const eventsApi = {
  getAll:      ()         => request('/events'),
  getUpcoming: (limit)    => request(`/events/upcoming${limit ? `?limit=${limit}` : ''}`),
  getById:     (id)       => request(`/events/${id}`),
  create:      (data)     => request('/events', { method: 'POST', body: data }),
  update:      (id, data) => request(`/events/${id}`, { method: 'PUT', body: data }),
  delete:      (id)       => request(`/events/${id}`, { method: 'DELETE' }),
};
