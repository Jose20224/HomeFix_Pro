const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const getToken = () => localStorage.getItem('hfp_token');
export const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...options.headers,
  };
  const res = await fetch(BASE_URL + endpoint, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.message || 'Error HTTP ' + res.status);
    error.status = res.status;
    if (res.status === 401 && token && !endpoint.startsWith('/auth/login')) window.dispatchEvent(new Event('hfp:unauthorized'));
    throw error;
  }
  return res.status === 204 ? null : res.json();
};
const write = (endpoint, method, data) => request(endpoint, { method, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
export const authApi = {
  register: data => write('/auth/register', 'POST', data),
  login: data => write('/auth/login', 'POST', data),
  me: () => request('/auth/me'),
  updateProfile: data => write('/auth/me', 'PUT', data),
};
export const requestsApi = {
  create: data => write('/requests', 'POST', data),
  myRequests: () => request('/requests/mine'),
  all: () => request('/requests/all'),
  available: (params = '') => request('/requests/available' + params),
  accept: id => write('/requests/' + id + '/accept', 'PUT'),
  updateStatus: (id, status) => write('/requests/' + id + '/status', 'PUT', { status }),
  cancel: id => write('/requests/' + id + '/cancel', 'PUT'),
};
export const reviewsApi = { create: data => write('/reviews', 'POST', data), forTechnician: id => request('/reviews/technician/' + id) };
export const categoriesApi = { list: () => request('/services/categories') };
export const providersApi = { list: (params = '') => request('/services/technicians' + params) };
export const notificationsApi = {
  list: () => request('/notifications'),
  markRead: id => write('/notifications/' + id + '/read', 'PUT'),
  markAllRead: () => write('/notifications/read-all', 'PUT'),
  unreadCount: () => request('/notifications/unread-count'),
};
export const scheduleApi = {
  create: data => write('/schedule', 'POST', data), mine: () => request('/schedule/mine'),
  update: (id, data) => write('/schedule/' + id, 'PUT', data), delete: id => write('/schedule/' + id, 'DELETE'),
};
export const verificationApi = {
  pending: () => request('/verification/pending'),
  approve: id => write('/verification/' + id + '/approve', 'PUT'),
  reject: (id, reason) => write('/verification/' + id + '/reject', 'PUT', { reason }),
  upload: data => request('/verification/upload', { method: 'POST', body: data }),
  download: async url => {
    if (!/^\/uploads\/[\w.-]+$/.test(url)) throw new Error('Documento inválido');
    const res = await fetch(BASE_URL.replace(/\/api$/, '') + url, { headers: { Authorization: 'Bearer ' + getToken() } });
    if (!res.ok) throw new Error('No se pudo descargar el documento');
    const blob = await res.blob();
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl; link.download = url.split('/').pop();
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  },
};
export const adminApi = {
  createUser: data => write('/users', 'POST', data), updateUser: (id, data) => write('/users/' + id, 'PUT', data),
  users: (params = '') => request('/users' + params),
  toggleUser: id => write('/users/' + id + '/toggle', 'PUT'),
  overview: () => request('/reports/overview'), byCategory: () => request('/reports/by-category'),
  byStatus: () => request('/reports/by-status'), trend: () => request('/reports/trend'),
  companies: () => request('/users/companies/pending'),
  verifyCompany: (id, status) => write('/users/companies/' + id + '/verification', 'PUT', { status }),
};
export const companiesApi = {
  mine: () => request('/companies/mine'), update: data => write('/companies/mine', 'PUT', data),
  employees: () => request('/companies/mine/employees'), addEmployee: data => write('/companies/mine/employees', 'POST', data),
  removeEmployee: id => write('/companies/mine/employees/' + id, 'DELETE'),
  assignJob: data => write('/companies/mine/assign', 'POST', data), jobs: () => request('/companies/mine/jobs'),
  updateStatus: (id, status) => write('/companies/mine/jobs/' + id + '/status', 'PUT', { status }),
};
