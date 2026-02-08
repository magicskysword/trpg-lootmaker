<template>
  <div class="page-shell">
    <n-card class="card top-nav" :bordered="false">
      <div class="top-nav-row">
        <div class="title-block">
          <h1>Pathfinder 1e Loot 管理器</h1>
          <p>会话自动续期中，离线草稿仅保存在本机浏览器。</p>
        </div>
        <n-space>
          <n-tag v-if="sessionState.adminVerified" type="success" round>管理员已验证</n-tag>
          <n-button tertiary type="error" @click="logout">退出登录</n-button>
        </n-space>
      </div>
      <n-tabs :value="activeTab" type="line" animated @update:value="goTab">
        <n-tab-pane name="/dashboard" tab="主控制台" />
        <n-tab-pane name="/characters" tab="角色数据" />
        <n-tab-pane name="/loot-register" tab="Loot登记" />
        <n-tab-pane name="/cards" tab="卡片展示" />
        <n-tab-pane name="/settings" tab="设置界面" />
      </n-tabs>
    </n-card>

    <div class="content-wrap">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NTabs, NTabPane, NSpace, NButton, NTag, useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';
import { clearSessionState, sessionState } from '../stores/session';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const activeTab = computed(() => route.path);

function goTab(tabPath) {
  if (tabPath !== route.path) {
    router.push(tabPath);
  }
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // 即便退出失败也清空前端状态
  }
  clearSessionState();
  message.success('已退出');
  router.push('/login');
}
</script>

<style scoped>
.top-nav {
  margin-bottom: 16px;
  border-radius: 14px;
}

.top-nav-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.title-block h1 {
  font-size: 24px;
  margin: 0;
}

.title-block p {
  margin: 6px 0 0;
  color: #486581;
}

.content-wrap {
  margin-top: 16px;
}
</style>
