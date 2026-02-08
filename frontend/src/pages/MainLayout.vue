<template>
  <div class="app-shell">
    <!-- Decorative top bar -->
    <div class="top-ornament"></div>

    <div class="page-shell">
      <header class="top-nav">
        <div class="top-nav-inner">
          <div class="title-block">
            <h1 class="app-title">
              <span class="title-icon">⚔</span>
              {{ campaignName || 'Pathfinder Loot Manager' }}
              <span class="title-icon">⚔</span>
            </h1>
            <p class="app-subtitle">{{ campaignName ? 'Pathfinder 1e 战役物资管理系统' : '开拓者 1e 战役物资管理系统' }}</p>
          </div>
          <div class="nav-actions">
            <span v-if="sessionState.adminVerified" class="fantasy-badge gold">✦ 管理员</span>
            <button class="logout-btn" @click="logout">
              <span>退出登录</span>
            </button>
          </div>
        </div>

        <nav class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.path"
            :class="['tab-item', { active: activeTab === tab.path }]"
            @click="goTab(tab.path)"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </nav>
      </header>

      <main class="content-wrap animate-fadeIn">
        <router-view />
      </main>

      <footer class="app-footer">
        <div class="footer-line"></div>
        <p>会话自动续期中 · 离线草稿仅保存在本机浏览器</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';
import { clearSessionState, sessionState } from '../stores/session';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const campaignName = ref('');

const tabs = [
  { path: '/dashboard', label: '主页', icon: '🏰' },
  { path: '/cards', label: '角色展示', icon: '🃏' },
  { path: '/data', label: '总数据', icon: '📜' },
  { path: '/loot-register', label: '数据登记', icon: '💎' },
  { path: '/settings', label: '设置', icon: '⚙' },
];

const activeTab = computed(() => route.path);

function goTab(tabPath) {
  if (tabPath !== route.path) {
    router.push(tabPath);
  }
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  clearSessionState();
  message.success('已退出');
  router.push('/login');
}

onMounted(async () => {
  try {
    const data = await apiRequest('/api/campaign-name');
    campaignName.value = data.campaign_name || '';
  } catch (_) {}
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  position: relative;
}

.top-ornament {
  height: 3px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--gold-dim) 15%,
    var(--gold) 30%,
    var(--gold-bright) 50%,
    var(--gold) 70%,
    var(--gold-dim) 85%,
    transparent 100%
  );
}

.top-nav {
  background: linear-gradient(180deg, rgba(30, 34, 64, 0.95) 0%, rgba(26, 30, 53, 0.9) 100%);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  padding: 20px 24px 0;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
  position: relative;
}

.top-nav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 5%;
  right: 5%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
}

.top-nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.title-block {
  flex: 1;
}

.app-title {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--gold);
  margin: 0;
  text-shadow: 0 0 30px var(--gold-glow);
  letter-spacing: 2px;
}

.title-icon {
  font-size: 18px;
  opacity: 0.7;
}

.app-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn {
  background: transparent;
  border: 1px solid rgba(192, 57, 43, 0.4);
  color: #e74c3c;
  padding: 6px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: all var(--transition);
}
.logout-btn:hover {
  background: var(--danger-soft);
  border-color: rgba(192, 57, 43, 0.7);
}

.tab-nav {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  white-space: nowrap;
  transition: all var(--transition);
  border-radius: var(--radius) var(--radius) 0 0;
}

.tab-item:hover {
  color: var(--gold);
  background: rgba(201, 168, 76, 0.05);
}

.tab-item.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
  background: rgba(201, 168, 76, 0.08);
  text-shadow: 0 0 10px var(--gold-glow);
}

.tab-icon {
  font-size: 16px;
}

.tab-label {
  font-weight: 500;
}

.content-wrap {
  min-height: calc(100vh - 250px);
}

.app-footer {
  margin-top: 40px;
  padding: 20px 0;
  text-align: center;
}

.footer-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
  margin-bottom: 16px;
}

.app-footer p {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 1px;
}
</style>
