import { reactive } from 'vue';
import { apiRequest } from '../utils/api';

export const sessionState = reactive({
  checked: false,
  loggedIn: false,
  adminVerified: false
});

export async function refreshSession() {
  const data = await apiRequest('/api/auth/session');
  sessionState.checked = true;
  sessionState.loggedIn = Boolean(data.loggedIn);
  sessionState.adminVerified = Boolean(data.adminVerified);
  return data;
}

export async function verifyAdmin(password) {
  const data = await apiRequest('/api/auth/admin-login', {
    method: 'POST',
    body: { password }
  });
  sessionState.adminVerified = true;
  return data;
}

export function clearSessionState() {
  sessionState.checked = true;
  sessionState.loggedIn = false;
  sessionState.adminVerified = false;
}

