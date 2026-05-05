const API_BASE = '/api';

const token = {
  get: () => localStorage.getItem('token'),
  set: (t) => localStorage.setItem('token', t),
  clear: () => localStorage.removeItem('token'),
};

async function request(path, options = {}) {
  const t = token.get();

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    token.clear();
    location.reload();
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

const api = {
  login(username, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getMachine(id) {
    return request(`/machines/${id}`);
  },

  submitReport(payload) {
    return request('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyHistory(limit = 10) {
    return request(`/reports/my?limit=${limit}`);
  },
};
