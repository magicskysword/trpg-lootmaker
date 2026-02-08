import { createRouter, createWebHistory } from 'vue-router';
import { refreshSession, sessionState } from './stores/session';

import LoginPage from './pages/LoginPage.vue';
import MainLayout from './pages/MainLayout.vue';
import DashboardPage from './pages/DashboardPage.vue';
import CharacterDataPage from './pages/CharacterDataPage.vue';
import LootRegisterPage from './pages/LootRegisterPage.vue';
import CardDisplayPage from './pages/CardDisplayPage.vue';
import SettingsPage from './pages/SettingsPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: LoginPage
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: '/dashboard', component: DashboardPage },
        { path: '/data', component: CharacterDataPage },
        { path: '/loot-register', component: LootRegisterPage },
        { path: '/cards', component: CardDisplayPage },
        { path: '/settings', component: SettingsPage }
      ]
    }
  ]
});

router.beforeEach(async (to) => {
  if (!sessionState.checked) {
    try {
      await refreshSession();
    } catch (_) {
      sessionState.checked = true;
      sessionState.loggedIn = false;
      sessionState.adminVerified = false;
    }
  }

  if (to.path === '/login' && sessionState.loggedIn) {
    return '/dashboard';
  }

  if (to.meta.requiresAuth && !sessionState.loggedIn) {
    return '/login';
  }

  return true;
});

export default router;
