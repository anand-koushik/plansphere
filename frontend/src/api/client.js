const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.CLIENT_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE_URL = `${API_BASE_URL}/api`;

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('plansphere_token');

  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeOrgId = localStorage.getItem('plansphere_active_org');
  if (activeOrgId) {
    headers['x-org-id'] = activeOrgId;
  }

  const activeProjectId = localStorage.getItem('plansphere_active_project');
  if (activeProjectId) {
    headers['x-project-id'] = activeProjectId;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // If token invalid/expired, we can clear and redirect if needed
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const api = {
  get: (url, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return apiClient(fullUrl, { method: 'GET' });
  },
  post: (url, body = {}) => apiClient(url, { method: 'POST', body }),
  put: (url, body = {}) => apiClient(url, { method: 'PUT', body }),
  patch: (url, body = {}) => apiClient(url, { method: 'PATCH', body }),
  delete: (url) => apiClient(url, { method: 'DELETE' }),
  upload: (url, file, fieldName = 'file') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return apiClient(url, { method: 'POST', body: formData });
  }
};
