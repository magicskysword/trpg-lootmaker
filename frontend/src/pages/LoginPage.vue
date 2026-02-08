<template>
  <div class="login-wrap">
    <n-card class="login-card" title="Pathfinder Loot Manager" :bordered="false">
      <p class="sub-title">输入普通密码后进入战役管理界面。</p>
      <n-form @submit.prevent="onSubmit">
        <n-form-item label="登录密码">
          <n-input
            v-model:value="password"
            type="password"
            show-password-on="click"
            placeholder="请输入普通密码"
            @keydown.enter.prevent="onSubmit"
          />
        </n-form-item>
        <n-space justify="end">
          <n-button type="primary" :loading="loading" @click="onSubmit">登录</n-button>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';
import { refreshSession } from '../stores/session';

const router = useRouter();
const message = useMessage();

const password = ref('');
const loading = ref(false);

async function onSubmit() {
  if (!password.value) {
    message.warning('请输入密码');
    return;
  }

  loading.value = true;
  try {
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        password: password.value
      }
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
}

.login-card {
  width: min(520px, 100%);
  border-radius: 16px;
  box-shadow: 0 30px 60px rgba(16, 42, 67, 0.12);
}

.sub-title {
  margin-top: 0;
  color: #486581;
}
</style>
