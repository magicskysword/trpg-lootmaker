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

export function clearSessionState() {
  sessionState.checked = true;
  sessionState.loggedIn = false;
  sessionState.adminVerified = false;
}
