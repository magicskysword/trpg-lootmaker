<template>
  <div class="settings-page">
    <h2 class="page-title">⚙ 设置界面</h2>

    <!-- Admin Gate -->
    <template v-if="!sessionState.adminVerified">
      <div class="admin-gate ornate-frame">
        <div class="gate-icon">🔒</div>
        <h3 class="gate-title">管理员验证</h3>
        <p class="gate-desc">进入设置页需要管理员密码二次验证</p>
        <div class="gate-form">
          <n-input
            v-model:value="adminPassword"
            type="password"
            show-password-on="click"
            placeholder="请输入管理员密码"
            size="large"
            @keydown.enter.prevent="verifyAdmin"
          />
          <n-button type="primary" size="large" :loading="verifying" @click="verifyAdmin">
            ✦ 验证身份
          </n-button>
        </div>
      </div>
    </template>

    <!-- Settings Content -->
    <template v-else>
      <!-- Campaign Settings -->
      <div class="ornate-frame campaign-card">
        <h3 class="section-title">🏰 战役设置</h3>
        <div class="campaign-form">
          <div class="form-group">
            <label class="form-label">战役名称（替代标题和副标题）</label>
            <n-input
              v-model:value="campaignName"
              placeholder="例如: 巨蛇之颅 / Rise of the Runelords"
            />
          </div>
          <n-button type="primary" size="small" @click="saveCampaignName">
            ✦ 保存战役名称
          </n-button>
        </div>
      </div>

      <!-- Provider Form -->
      <div class="ornate-frame provider-form-card">
        <h3 class="section-title">
          {{ form.id ? '编辑 AI Provider' : '✦ 新建 AI Provider' }}
        </h3>
        <div class="provider-form-grid">
          <div class="form-group">
            <label class="form-label">名称</label>
            <n-input v-model:value="form.name" placeholder="Provider名称" />
          </div>
          <div class="form-group">
            <label class="form-label">类型</label>
            <n-select v-model:value="form.provider_type" :options="typeOptions" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Base URL</label>
            <n-input v-model:value="form.base_url" placeholder="例如 https://api.openai.com/v1" />
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <n-input v-model:value="form.api_key" placeholder="可为空" type="password" show-password-on="click" />
          </div>
          <div class="form-group">
            <label class="form-label">Model</label>
            <n-input v-model:value="form.model" placeholder="模型名" />
          </div>
          <div class="form-group">
            <label class="form-label">温度</label>
            <n-input-number v-model:value="form.temperature" :min="0" :max="2" :step="0.1" />
          </div>
          <div class="form-group">
            <label class="form-label">多模态</label>
            <n-switch v-model:value="form.is_multimodal" />
          </div>
          <div class="form-group">
            <label class="form-label">图片转述Provider</label>
            <n-select
              v-model:value="form.image_caption_provider_id"
              :options="captionProviderOptions"
              clearable
            />
          </div>
          <div class="form-group">
            <label class="form-label">设为默认</label>
            <n-switch v-model:value="form.is_default" />
          </div>
        </div>
        <div class="form-actions">
          <n-button type="primary" @click="saveProvider">
            {{ form.id ? '✦ 更新Provider' : '✦ 创建Provider' }}
          </n-button>
          <n-button v-if="form.id" @click="resetForm">取消编辑</n-button>
        </div>
      </div>

      <!-- Providers List -->
      <div class="providers-list">
        <div
          v-for="row in providers"
          :key="row.id"
          class="provider-card ornate-frame"
        >
          <div class="pc-header">
            <div class="pc-name">{{ row.name }}</div>
            <div class="pc-badges">
              <span v-if="row.is_default" class="fantasy-badge gold">默认</span>
              <span v-if="row.is_multimodal" class="fantasy-badge arcane">多模态</span>
            </div>
          </div>
          <div class="pc-details">
            <div class="pc-detail-row">
              <span class="pc-label">类型</span>
              <span>{{ row.provider_type }}</span>
            </div>
            <div class="pc-detail-row">
              <span class="pc-label">Base URL</span>
              <span class="pc-url">{{ row.base_url }}</span>
            </div>
            <div class="pc-detail-row">
              <span class="pc-label">Model</span>
              <span>{{ row.model || '-' }}</span>
            </div>
          </div>
          <div class="pc-actions">
            <button class="icon-btn" title="编辑" @click="editProvider(row)">📝</button>
            <button class="icon-btn" title="拉取模型" @click="loadModels(row)">📡</button>
            <button class="icon-btn danger" title="删除" @click="removeProvider(row)">🗑</button>
          </div>
        </div>
      </div>

      <!-- Models list -->
      <div v-if="models.length" class="ornate-frame models-panel">
        <h3 class="section-title">📋 可用模型</h3>
        <div class="models-grid">
          <button
            v-for="name in models"
            :key="name"
            class="model-chip"
            @click="form.model = name"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  NInput,
  NButton,
  NSelect,
  NInputNumber,
  NSwitch,
  useMessage
} from 'naive-ui';
import { apiRequest } from '../utils/api';
import { refreshSession, sessionState } from '../stores/session';

const message = useMessage();
const verifying = ref(false);
const adminPassword = ref('');
const providers = ref([]);
const models = ref([]);
const campaignName = ref('');

const typeOptions = [
  { label: 'OpenAI兼容', value: 'openai_compatible' },
  { label: 'Google格式', value: 'google' }
];

const form = reactive({
  id: '',
  name: '',
  provider_type: 'openai_compatible',
  base_url: '',
  api_key: '',
  model: '',
  temperature: 1,
  is_multimodal: false,
  image_caption_provider_id: null,
  is_default: false
});

const captionProviderOptions = computed(() =>
  providers.value
    .filter((x) => x.id !== form.id)
    .map((x) => ({ label: x.name, value: x.id }))
);

function resetForm() {
  form.id = '';
  form.name = '';
  form.provider_type = 'openai_compatible';
  form.base_url = '';
  form.api_key = '';
  form.model = '';
  form.temperature = 1;
  form.is_multimodal = false;
  form.image_caption_provider_id = null;
  form.is_default = false;
}

function editProvider(row) {
  form.id = row.id;
  form.name = row.name;
  form.provider_type = row.provider_type;
  form.base_url = row.base_url;
  form.api_key = '';
  form.model = row.model || '';
  form.temperature = Number(row.temperature || 1);
  form.is_multimodal = Boolean(row.is_multimodal);
  form.image_caption_provider_id = row.image_caption_provider_id || null;
  form.is_default = Boolean(row.is_default);
}

async function verifyAdmin() {
  if (!adminPassword.value) {
    message.warning('请输入管理员密码');
    return;
  }
  verifying.value = true;
  try {
    await apiRequest('/api/auth/admin-login', {
      method: 'POST',
      body: { password: adminPassword.value }
    });
    await refreshSession();
    await loadProviders();
    message.success('管理员验证成功');
  } catch (error) {
    message.error(error.message || '管理员验证失败');
  } finally {
    verifying.value = false;
  }
}

async function loadProviders() {
  providers.value = await apiRequest('/api/settings/providers');
}

async function loadCampaignName() {
  try {
    const data = await apiRequest('/api/settings/campaign');
    campaignName.value = data.campaign_name || '';
  } catch (_) {}
}

async function saveCampaignName() {
  try {
    await apiRequest('/api/settings/campaign', {
      method: 'PUT',
      body: { campaign_name: campaignName.value }
    });
    message.success('战役名称已保存');
  } catch (error) {
    message.error(error.message || '保存失败');
  }
}

async function saveProvider() {
  if (!form.name || !form.base_url) {
    message.warning('名称和Base URL为必填项');
    return;
  }
  const payload = {
    name: form.name,
    provider_type: form.provider_type,
    base_url: form.base_url,
    api_key: form.api_key,
    model: form.model,
    temperature: Number(form.temperature || 1),
    is_multimodal: form.is_multimodal,
    image_caption_provider_id: form.image_caption_provider_id,
    is_default: form.is_default
  };
  try {
    if (form.id) {
      await apiRequest(`/api/settings/providers/${form.id}`, { method: 'PUT', body: payload });
      message.success('Provider已更新');
    } else {
      await apiRequest('/api/settings/providers', { method: 'POST', body: payload });
      message.success('Provider已创建');
    }
    resetForm();
    await loadProviders();
  } catch (error) {
    message.error(error.message || '保存Provider失败');
  }
}

async function removeProvider(row) {
  if (!window.confirm(`确认删除Provider：${row.name} ?`)) return;
  try {
    await apiRequest(`/api/settings/providers/${row.id}`, { method: 'DELETE' });
    message.success('Provider已删除');
    await loadProviders();
  } catch (error) {
    message.error(error.message || '删除Provider失败');
  }
}

async function loadModels(row) {
  try {
    const data = await apiRequest(`/api/settings/providers/${row.id}/fetch-models`, { method: 'POST' });
    models.value = data.models || [];
    if (models.value.length) {
      message.success(`拉取成功，共 ${models.value.length} 个模型`);
    } else {
      message.warning('未获取到模型列表');
    }
  } catch (error) {
    message.error(error.message || '拉取模型失败');
  }
}

onMounted(async () => {
  if (sessionState.adminVerified) {
    try {
      await Promise.all([loadProviders(), loadCampaignName()]);
    } catch (error) {
      message.error(error.message || '加载设置失败');
    }
  }
});
</script>

<style scoped>
.settings-page {
  position: relative;
}

/* Admin Gate */
.admin-gate {
  max-width: 480px;
  margin: 60px auto;
  text-align: center;
  padding: 40px;
}

.gate-icon {
  font-size: 48px;
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}

.gate-title {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 22px;
  color: var(--gold);
  margin: 0 0 8px;
}

.gate-desc {
  color: var(--text-secondary);
  margin: 0 0 24px;
  font-size: 14px;
}

.gate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Provider form */
.provider-form-card {
  margin-bottom: 24px;
}

/* Campaign settings */
.campaign-card {
  margin-bottom: 24px;
}

.campaign-form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.campaign-form .form-group {
  flex: 1;
  min-width: 240px;
}

.provider-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 640px) {
  .provider-form-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  color: var(--gold);
  letter-spacing: 0.5px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

/* Providers list */
.providers-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.provider-card {
  padding: 20px;
}

.pc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pc-name {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-bright);
}

.pc-badges {
  display: flex;
  gap: 6px;
}

.pc-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.pc-detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.pc-label {
  color: var(--gold-dim);
  min-width: 70px;
  flex-shrink: 0;
}

.pc-url {
  word-break: break-all;
  color: var(--text-secondary);
}

.pc-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  display: inline-grid;
  place-items: center;
  transition: all var(--transition);
}
.icon-btn:hover {
  border-color: var(--gold);
  background: var(--gold-glow);
}
.icon-btn.danger:hover {
  border-color: var(--danger);
  background: var(--danger-soft);
}

/* Models panel */
.models-panel {
  margin-bottom: 24px;
}

.models-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.model-chip {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: all var(--transition);
}
.model-chip:hover {
  border-color: var(--gold);
  background: var(--gold-glow);
  color: var(--gold);
}
</style>
