<template>
  <div class="login-wrap">
    <!-- Floating particles -->
    <div class="particle-bg">
      <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <div class="login-portal">
      <!-- Ornate border glow -->
      <div class="portal-glow"></div>

      <div class="portal-inner">
        <!-- Title -->
        <div class="portal-header">
          <div class="emblem">⚜</div>
          <h1 class="portal-title">Pathfinder</h1>
          <h2 class="portal-subtitle">Loot Manager</h2>
          <div class="ornament-line">
            <span></span>
            <span class="diamond">◆</span>
            <span></span>
          </div>
        </div>

        <!-- Form -->
        <div class="portal-body">
          <p class="portal-hint">输入密码以进入战役管理界面</p>
          <div class="input-group">
            <label class="input-label">登录密码</label>
            <n-input
              v-model:value="password"
              type="password"
              show-password-on="click"
              placeholder="请输入普通密码"
              size="large"
              @keydown.enter.prevent="onSubmit"
            />
          </div>
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            class="login-btn"
            @click="onSubmit"
          >
            <span class="btn-text">⚔ 进入战役 ⚔</span>
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';
import { refreshSession } from '../stores/session';

const router = useRouter();
const message = useMessage();
const password = ref('');
const loading = ref(false);

function particleStyle(i) {
  const left = Math.random() * 100;
  const delay = Math.random() * 8;
  const duration = 6 + Math.random() * 8;
  const size = 2 + Math.random() * 3;
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

async function onSubmit() {
  if (!password.value) {
    message.warning('请输入密码');
    return;
  }

  loading.value = true;
  try {
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    });
    await refreshSession();
    message.success('登录成功');
    router.push('/dashboard');
  } catch (error) {
    message.error(error.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(110, 92, 199, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 80%, rgba(201, 168, 76, 0.08) 0%, transparent 50%),
    var(--bg-deep);
}

.login-portal {
  position: relative;
  z-index: 1;
  width: min(480px, 100%);
}

.portal-glow {
  position: absolute;
  inset: -2px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--gold-dim), var(--arcane-dim), var(--gold-dim));
  z-index: -1;
  animation: pulseGlow 3s ease-in-out infinite;
}

.portal-inner {
  background: linear-gradient(180deg, #1e2240 0%, #171b35 50%, #1a1e38 100%);
  border-radius: 22px;
  padding: 40px 36px;
  position: relative;
  overflow: hidden;
}

.portal-inner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(201, 168, 76, 0.06) 0%, transparent 60%);
  pointer-events: none;
}

.portal-header {
  text-align: center;
  margin-bottom: 32px;
}

.emblem {
  font-size: 48px;
  color: var(--gold);
  text-shadow: 0 0 30px var(--gold-glow), 0 0 60px rgba(201, 168, 76, 0.15);
  margin-bottom: 8px;
  animation: float 4s ease-in-out infinite;
}

.portal-title {
  font-family: 'Cinzel', serif;
  font-size: 36px;
  font-weight: 700;
  color: var(--gold);
  margin: 0;
  letter-spacing: 4px;
  text-shadow: 0 0 20px var(--gold-glow);
}

.portal-subtitle {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--gold-dim);
  margin: 4px 0 0;
  letter-spacing: 6px;
  text-transform: uppercase;
}

.ornament-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.ornament-line span:first-child,
.ornament-line span:last-child {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim));
}
.ornament-line span:last-child {
  background: linear-gradient(90deg, var(--gold-dim), transparent);
}
.ornament-line .diamond {
  color: var(--gold);
  font-size: 10px;
  text-shadow: 0 0 10px var(--gold-glow);
}

.portal-body {
  position: relative;
}

.portal-hint {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 24px;
}

.input-group {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 13px;
  color: var(--gold-dim);
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.login-btn {
  height: 48px;
  font-size: 16px;
  letter-spacing: 2px;
  border-radius: 12px;
  font-family: 'LXGW WenKai', serif;
}

.btn-text {
  font-weight: 600;
}
</style>
