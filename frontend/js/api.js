// ─── API CONFIGURATION ───
const API_URL = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://classroom-booking-system-14n1.onrender.com/api';

// ─── TOKEN HELPERS ───
// Save token to localStorage after login
const saveToken = (token) => localStorage.setItem('token', token);

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Remove token on logout
const removeToken = () => localStorage.removeItem('token');

// Save user info to localStorage
const saveUser = (user) => localStorage.setItem('user', JSON.stringify(user));

// Get user info from localStorage
const getUser = () => JSON.parse(localStorage.getItem('user'));

// Remove user info on logout
const removeUser = () => localStorage.removeItem('user');

// ─── REDIRECT BASED ON ROLE ───
// After login, send user to their correct dashboard
const redirectToDashboard = (role) => {
  if (role === 'admin')   window.location.href = '/frontend/pages/admin/dashboard.html';
  if (role === 'teacher') window.location.href = '/frontend/pages/teacher/dashboard.html';
  if (role === 'student') window.location.href = '/frontend/pages/student/dashboard.html';
};

// ─── AUTH GUARD ───
// Call this on every dashboard page
// If user is not logged in, send them back to login
const requireAuth = () => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = '/frontend/index.html';
  }
  return user;
};

// ─── ROLE GUARD ───
// Call this on role-specific pages
// If user has wrong role, redirect them
const requireRole = (role) => {
  const user = requireAuth();
  if (user.role !== role) {
    redirectToDashboard(user.role);
  }
  return user;
};

// ─── LOGOUT ───
const logout = () => {
  removeToken();
  removeUser();
  window.location.href = '/frontend/index.html';
};

// ─── MAIN API FUNCTION ───
// This is the core function all other API calls use
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  // Attach token if it exists
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  // If token expired or invalid, log user out
  if (response.status === 401 || response.status === 403) {
    logout();
    return;
  }

  return { ok: response.ok, status: response.status, data };
};

// ─── AUTH API CALLS ───
const authAPI = {
  signup: (body) => apiRequest('/auth/signup', 'POST', body),
  login:  (body) => apiRequest('/auth/login', 'POST', body),
  me:     ()     => apiRequest('/auth/me')
};

// ─── ROOMS API CALLS ───
const roomsAPI = {
  getAll:  ()         => apiRequest('/rooms'),
  getOne:  (id)       => apiRequest(`/rooms/${id}`),
  create:  (body)     => apiRequest('/rooms', 'POST', body),
  update:  (id, body) => apiRequest(`/rooms/${id}`, 'PUT', body),
  delete:  (id)       => apiRequest(`/rooms/${id}`, 'DELETE')
};

// ─── BOOKINGS API CALLS ───
const bookingsAPI = {
  getAll:    ()         => apiRequest('/bookings'),
  getAllRooms:()         => apiRequest('/bookings/all'),
  create:    (body)     => apiRequest('/bookings', 'POST', body),
  update:    (id, body) => apiRequest(`/bookings/${id}`, 'PUT', body),
  cancel:    (id)       => apiRequest(`/bookings/${id}`, 'DELETE')
};

// ─── NOTIFICATIONS API CALLS ───
const notificationsAPI = {
  getAll:     ()   => apiRequest('/notifications'),
  markRead:   (id) => apiRequest(`/notifications/${id}/read`, 'PUT'),
  markAllRead:()   => apiRequest('/notifications/read-all', 'PUT')
};

// ─── TOAST NOTIFICATIONS ───
// Call showToast('message', 'success') anywhere to show a popup
const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => toast.remove(), 3000);
};

// ─── DARK MODE ───
const initTheme = () => {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
};

// Initialize theme on every page load
initTheme();