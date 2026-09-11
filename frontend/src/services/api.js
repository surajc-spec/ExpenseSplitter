/**
 * Centralized API Service for ExpenseSplitter Frontend
 * Handles credentials, headers, JSON parsing, error handling, rate limiting (HTTP 429), and idempotency.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.retryAfter = data.retryAfter;
  }
}

const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    method: options.method || 'GET',
    headers,
    credentials: 'include', // Always include HTTP-only cookies
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    
    let data = {};
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      if (response.status === 429) {
        const seconds = data.retryAfter ? ` in ${data.retryAfter} seconds` : '';
        throw new ApiError(`Too many requests. Please try again${seconds}.`, 429, data);
      }
      if (response.status === 409) {
        throw new ApiError(data.message || 'Conflict error occurred', 409, data);
      }
      if (response.status === 401) {
        throw new ApiError(data.message || 'Authentication required', 401, data);
      }
      if (response.status === 403) {
        throw new ApiError(data.message || 'Permission denied', 403, data);
      }
      throw new ApiError(data.message || `Request failed with status ${response.status}`, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error connection failed', 500);
  }
};

export const api = {
  // Authentication
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: { name, email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Groups
  getGroups: () => request('/groups'),
  createGroup: (name) => request('/groups', { method: 'POST', body: { name } }),
  getGroupMembers: (groupId) => request(`/groups/${groupId}/members`),
  addMember: (groupId, email) => request(`/groups/${groupId}/members`, { method: 'POST', body: { email } }),
  removeMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  updateMemberRole: (groupId, userId, role) => request(`/groups/${groupId}/members/${userId}/role`, { method: 'PUT', body: { role } }),
  leaveGroup: (groupId) => request(`/groups/${groupId}/leave`, { method: 'DELETE' }),
  transferOwnership: (groupId, userId) => request(`/groups/${groupId}/ownership`, { method: 'PUT', body: { userId } }),

  // Expenses
  createExpense: (groupId, expenseData) => request(`/groups/${groupId}/expenses`, { method: 'POST', body: expenseData }),
  getGroupExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
  getGroupBalances: (groupId) => request(`/groups/${groupId}/balances`),

  // Settlements
  getSuggestedSettlements: (groupId) => request(`/groups/${groupId}/settlements/suggested`),
  recordSettlement: (groupId, settlementData, idempotencyKey) => 
    request(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: settlementData,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    }),
};
