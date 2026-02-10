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
            placeholder="管理员密码"
            @keydown.enter="doAdminVerify"
          />
          <n-button type="primary" :loading="adminVerifying" @click="doAdminVerify">
            🔑 验证
          </n-button>
        </div>
      </div>
    </template>

    <!-- Settings Content -->
    <template v-else>
      <div class="settings-layout">
        <!-- Left sidebar navigation -->
        <div class="settings-nav">
          <div
            v-for="cat in categories"
            :key="cat.key"
            class="nav-item"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            <span class="nav-icon">{{ cat.icon }}</span>
            <span class="nav-label">{{ cat.label }}</span>
          </div>
        </div>

        <!-- Right content area -->
        <div class="settings-content">
          <!-- 战役设置 -->
          <div v-show="activeCategory === 'campaign'" class="settings-section">
            <h3 class="section-heading">🏰 战役设置</h3>
            <p class="section-desc">配置应用的标题、副标题和战役名称。战役名称会覆盖标题在导航栏的显示。</p>

            <div class="form-grid">
              <div class="form-item">
                <label>应用标题</label>
                <n-input v-model:value="siteConfig.app_title" placeholder="TRPG Loot Manager" />
                <span class="form-hint">显示在导航栏和登录页</span>
              </div>
              <div class="form-item">
                <label>应用副标题</label>
                <n-input v-model:value="siteConfig.app_subtitle" placeholder="Loot Manager" />
                <span class="form-hint">显示在登录页标题下方</span>
              </div>
              <div class="form-item">
                <label>战役名称</label>
                <n-input v-model:value="siteConfig.campaign_name" placeholder="留空则显示应用标题" />
                <span class="form-hint">填写后将替代应用标题显示在导航栏</span>
              </div>
            </div>

            <div class="section-actions">
              <n-button type="primary" :loading="savingSiteConfig" @click="saveSiteConfig">
                💾 保存战役设置
              </n-button>
            </div>
          </div>

          <!-- 主持人设置 -->
          <div v-show="activeCategory === 'host'" class="settings-section">
            <h3 class="section-heading">🎭 主持人设置</h3>
            <p class="section-desc">自定义主持人的显示名称。内部数据始终使用 GM，此设置仅影响界面显示。</p>

            <div class="form-grid">
              <div class="form-item">
                <label>主持人称呼</label>
                <n-input v-model:value="siteConfig.gm_display_name" placeholder="GM" />
                <span class="form-hint">例如：GM、DM、KP、守密人等</span>
              </div>
            </div>

            <div class="section-actions">
              <n-button type="primary" :loading="savingSiteConfig" @click="saveSiteConfig">
                💾 保存主持人设置
              </n-button>
            </div>
          </div>

          <!-- AI 设置 -->
          <div v-show="activeCategory === 'ai'" class="settings-section">
            <h3 class="section-heading">🤖 AI Provider 管理</h3>
            <p class="section-desc">配置 AI 解析所使用的大语言模型 Provider。</p>

            <!-- Provider list -->
            <div class="provider-list">
              <div v-for="p in providers" :key="p.id" class="provider-card ornate-frame">
                <div class="provider-header">
                  <span class="provider-name">{{ p.name }}</span>
                  <div class="provider-badges">
                    <span v-if="p.is_default" class="fantasy-badge gold">默认</span>
                    <span class="fantasy-badge arcane">{{ p.provider_type }}</span>
                  </div>
                </div>
                <div class="provider-details">
                  <div class="detail-row">
                    <span class="detail-label">Base URL</span>
                    <span class="detail-value">{{ p.base_url }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Model</span>
                    <span class="detail-value">{{ p.model || '未设置' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">API Key</span>
                    <span class="detail-value">{{ p.has_api_key ? '••••••••' : '未设置' }}</span>
                  </div>
                </div>
                <div class="provider-actions">
                  <n-button size="small" @click="editProvider(p)">📝 编辑</n-button>
                  <n-button size="small" @click="fetchModels(p)">📦 拉取模型</n-button>
                  <n-button size="small" type="error" quaternary @click="deleteProvider(p)">🗑 删除</n-button>
                </div>
              </div>
              <div v-if="!providers.length" class="empty-hint">
                暂无 AI Provider，请点击下方按钮添加
              </div>
            </div>

            <n-button type="primary" @click="showProviderForm = true" style="margin-top: 12px">
              ✦ 添加 Provider
            </n-button>

            <!-- Provider Form Modal -->
            <n-modal
              v-model:show="showProviderForm"
              preset="card"
              :title="editingProvider ? '编辑 Provider' : '添加 Provider'"
              style="max-width: 560px"
              :bordered="false"
            >
              <div class="form-grid">
                <div class="form-item">
                  <label>名称 *</label>
                  <n-input v-model:value="providerForm.name" placeholder="例如：OpenAI / Gemini" />
                </div>
                <div class="form-item">
                  <label>类型</label>
                  <n-select
                    v-model:value="providerForm.provider_type"
                    :options="providerTypeOptions"
                  />
                </div>
                <div class="form-item full-width">
                  <label>Base URL *</label>
                  <n-input v-model:value="providerForm.base_url" placeholder="https://api.openai.com/v1" />
                </div>
                <div class="form-item full-width">
                  <label>API Key</label>
                  <n-input v-model:value="providerForm.api_key" type="password" show-password-on="click" placeholder="sk-..." />
                </div>
                <div class="form-item">
                  <label>模型</label>
                  <n-auto-complete
                    v-model:value="providerForm.model"
                    :options="modelSuggestions"
                    placeholder="gpt-4o"
                    clearable
                  />
                </div>
                <div class="form-item">
                  <label>Temperature</label>
                  <n-input-number v-model:value="providerForm.temperature" :min="0" :max="2" :step="0.1" />
                </div>
                <div class="form-item">
                  <label>&nbsp;</label>
                  <n-checkbox v-model:checked="providerForm.is_multimodal">支持多模态（图片输入）</n-checkbox>
                </div>
                <div class="form-item">
                  <label>&nbsp;</label>
                  <n-checkbox v-model:checked="providerForm.is_default">设为默认 Provider</n-checkbox>
                </div>
                <div class="form-item full-width" v-if="!providerForm.is_multimodal">
                  <label>图片转述 Provider</label>
                  <n-select
                    v-model:value="providerForm.image_caption_provider_id"
                    :options="captionProviderOptions"
                    clearable
                    placeholder="选择多模态Provider用于图片转述"
                  />
                </div>
              </div>
              <template #footer>
                <div class="modal-footer">
                  <n-button @click="showProviderForm = false">取消</n-button>
                  <n-button type="primary" :loading="savingProvider" @click="saveProvider">
                    💾 保存
                  </n-button>
                </div>
              </template>
            </n-modal>

            <!-- Model List Modal -->
            <n-modal
              v-model:show="showModelList"
              preset="card"
              title="可用模型列表"
              style="max-width: 480px"
              :bordered="false"
            >
              <div v-if="fetchingModels" style="text-align: center; padding: 20px">
                <n-spin />
                <p style="margin-top: 8px; color: var(--text-secondary)">正在拉取模型列表…</p>
              </div>
              <div v-else>
                <div v-for="m in modelList" :key="m" class="model-item" @click="selectModel(m)">
                  {{ m }}
                </div>
                <div v-if="!modelList.length" class="empty-hint">无可用模型</div>
              </div>
            </n-modal>
          </div>

          <!-- AI 提示词 -->
          <div v-show="activeCategory === 'prompts'" class="settings-section">
            <h3 class="section-heading">📝 AI 提示词</h3>
            <p class="section-desc">自定义 AI 解析使用的系统提示词。留空则使用默认提示词。支持模板变量注入。</p>

            <div class="template-vars-info ornate-frame">
              <h4>📎 可用模板变量</h4>
              <table class="vars-table">
                <thead>
                  <tr><th>变量</th><th>说明</th><th>适用</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code v-pre>{{game_rules}}</code></td>
                    <td>在「游戏规则」中设置的规则文本</td>
                    <td>全部</td>
                  </tr>
                  <tr>
                    <td><code v-pre>{{types}}</code></td>
                    <td>仓库中已有的物品类型列表（自动生成）</td>
                    <td>Loot 解析</td>
                  </tr>
                  <tr>
                    <td><code v-pre>{{slots}}</code></td>
                    <td>仓库中已有的装备槽位列表（自动生成）</td>
                    <td>Loot 解析</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="prompt-editors">
              <div class="prompt-editor-block">
                <div class="prompt-header">
                  <label>📥 Loot 解析提示词</label>
                  <n-button size="tiny" quaternary @click="resetPrompt('prompt_loot')">↺ 恢复默认</n-button>
                </div>
                <n-input
                  v-model:value="prompts.prompt_loot"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 12 }"
                  placeholder="留空使用默认提示词"
                />
              </div>

              <div class="prompt-editor-block">
                <div class="prompt-header">
                  <label>📤 支出解析提示词</label>
                  <n-button size="tiny" quaternary @click="resetPrompt('prompt_expense')">↺ 恢复默认</n-button>
                </div>
                <n-input
                  v-model:value="prompts.prompt_expense"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 12 }"
                  placeholder="留空使用默认提示词"
                />
              </div>

              <div class="prompt-editor-block">
                <div class="prompt-header">
                  <label>👤 角色解析提示词</label>
                  <n-button size="tiny" quaternary @click="resetPrompt('prompt_character')">↺ 恢复默认</n-button>
                </div>
                <n-input
                  v-model:value="prompts.prompt_character"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 12 }"
                  placeholder="留空使用默认提示词"
                />
              </div>
            </div>

            <div class="section-actions">
              <n-button type="primary" :loading="savingPrompts" @click="savePrompts">
                💾 保存提示词
              </n-button>
            </div>
          </div>

          <!-- 游戏规则 -->
          <div v-show="activeCategory === 'rules'" class="settings-section">
            <h3 class="section-heading">📜 游戏规则</h3>
            <p class="section-desc">
              填写当前使用的游戏规则说明。该文本会通过
              <code v-pre>{{game_rules}}</code>
              模板变量自动注入到所有 AI 提示词中，帮助 AI 更好地理解游戏背景。
            </p>

            <div class="form-grid">
              <div class="form-item full-width">
                <label>游戏规则文本</label>
                <n-input
                  v-model:value="gameRules"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 20 }"
                  placeholder="例如：我们使用Pathfinder 1e规则体系，物品类型包含装备、药水、卷轴等..."
                />
                <span class="form-hint">可以包含游戏版本、特殊规则、自定义物品类型等信息</span>
              </div>
            </div>

            <div class="section-actions">
              <n-button type="primary" :loading="savingGameRules" @click="saveGameRules">
                💾 保存游戏规则
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, reactive } from 'vue';
import {
  NButton,
  NInput,
  NInputNumber,
  NSelect,
  NAutoComplete,
  NCheckbox,
  NModal,
  NSpin,
  useMessage,
  useDialog
} from 'naive-ui';
import { apiRequest } from '../utils/api';
import { sessionState, verifyAdmin } from '../stores/session';

const message = useMessage();
const dialog = useDialog();

// ==================== Admin Gate ====================
const adminPassword = ref('');
const adminVerifying = ref(false);

async function doAdminVerify() {
  if (!adminPassword.value) {
    message.warning('请输入管理员密码');
    return;
  }
  adminVerifying.value = true;
  try {
    await verifyAdmin(adminPassword.value);
    message.success('验证成功');
    loadAllSettings();
  } catch (error) {
    message.error(error.message || '验证失败');
  } finally {
    adminVerifying.value = false;
  }
}

// ==================== Category Navigation ====================
const activeCategory = ref('campaign');

const categories = [
  { key: 'campaign', icon: '🏰', label: '战役设置' },
  { key: 'host', icon: '🎭', label: '主持人设置' },
  { key: 'ai', icon: '🤖', label: 'AI 设置' },
  { key: 'prompts', icon: '📝', label: 'AI 提示词' },
  { key: 'rules', icon: '📜', label: '游戏规则' }
];

// ==================== Site Config ====================
const siteConfig = reactive({
  campaign_name: '',
  app_title: '',
  app_subtitle: '',
  gm_display_name: 'GM'
});
const savingSiteConfig = ref(false);

async function loadSiteConfig() {
  try {
    const data = await apiRequest('/api/settings/site-config');
    Object.assign(siteConfig, data);
  } catch (_) {}
}

async function saveSiteConfig() {
  savingSiteConfig.value = true;
  try {
    const data = await apiRequest('/api/settings/site-config', {
      method: 'PUT',
      body: { ...siteConfig }
    });
    Object.assign(siteConfig, data);
    message.success('保存成功');
  } catch (error) {
    message.error(error.message || '保存失败');
  } finally {
    savingSiteConfig.value = false;
  }
}

// ==================== AI Providers ====================
const providers = ref([]);
const showProviderForm = ref(false);
const editingProvider = ref(null);
const savingProvider = ref(false);
const showModelList = ref(false);
const fetchingModels = ref(false);
const modelList = ref([]);
const modelSuggestions = ref([]);
const modelSelectTarget = ref(null);

const providerForm = reactive({
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

const providerTypeOptions = [
  { label: 'OpenAI Compatible', value: 'openai_compatible' },
  { label: 'Google (Gemini)', value: 'google' }
];

const captionProviderOptions = computed(() =>
  providers.value
    .filter((p) => p.is_multimodal)
    .map((p) => ({ label: p.name, value: p.id }))
);

async function loadProviders() {
  try {
    providers.value = await apiRequest('/api/settings/providers');
  } catch (_) {}
}

function editProvider(p) {
  editingProvider.value = p;
  Object.assign(providerForm, {
    name: p.name,
    provider_type: p.provider_type,
    base_url: p.base_url,
    api_key: '',
    model: p.model || '',
    temperature: p.temperature ?? 1,
    is_multimodal: p.is_multimodal,
    image_caption_provider_id: p.image_caption_provider_id || null,
    is_default: p.is_default
  });
  showProviderForm.value = true;
}

function resetProviderForm() {
  editingProvider.value = null;
  Object.assign(providerForm, {
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
}

async function saveProvider() {
  if (!providerForm.name || !providerForm.base_url) {
    message.warning('名称和 Base URL 为必填项');
    return;
  }
  savingProvider.value = true;
  try {
    const payload = { ...providerForm };
    if (editingProvider.value && !payload.api_key) {
      delete payload.api_key;
    }

    if (editingProvider.value) {
      await apiRequest(`/api/settings/providers/${editingProvider.value.id}`, {
        method: 'PUT',
        body: payload
      });
    } else {
      await apiRequest('/api/settings/providers', {
        method: 'POST',
        body: payload
      });
    }

    showProviderForm.value = false;
    resetProviderForm();
    await loadProviders();
    message.success('Provider 已保存');
  } catch (error) {
    message.error(error.message || '保存失败');
  } finally {
    savingProvider.value = false;
  }
}

async function deleteProvider(p) {
  dialog.warning({
    title: '删除 Provider',
    content: `确定要删除 "${p.name}"？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await apiRequest(`/api/settings/providers/${p.id}`, { method: 'DELETE' });
        await loadProviders();
        message.success('已删除');
      } catch (error) {
        message.error(error.message || '删除失败');
      }
    }
  });
}

async function fetchModels(p) {
  modelSelectTarget.value = p;
  modelList.value = [];
  showModelList.value = true;
  fetchingModels.value = true;
  try {
    const data = await apiRequest(`/api/settings/providers/${p.id}/fetch-models`, {
      method: 'POST'
    });
    modelList.value = data.models || [];
    modelSuggestions.value = modelList.value.map((m) => ({ label: m, value: m }));
  } catch (error) {
    message.error(error.message || '拉取模型失败');
    showModelList.value = false;
  } finally {
    fetchingModels.value = false;
  }
}

async function selectModel(m) {
  if (!modelSelectTarget.value) return;
  try {
    await apiRequest(`/api/settings/providers/${modelSelectTarget.value.id}`, {
      method: 'PUT',
      body: { model: m }
    });
    await loadProviders();
    message.success(`模型已设置为 ${m}`);
  } catch (error) {
    message.error(error.message || '设置模型失败');
  }
  showModelList.value = false;
}

// ==================== AI Prompts ====================
const prompts = reactive({
  prompt_loot: '',
  prompt_expense: '',
  prompt_character: ''
});
const savingPrompts = ref(false);

async function loadPrompts() {
  try {
    const data = await apiRequest('/api/settings/prompts');
    Object.assign(prompts, data);
  } catch (_) {}
}

async function savePrompts() {
  savingPrompts.value = true;
  try {
    const data = await apiRequest('/api/settings/prompts', {
      method: 'PUT',
      body: { ...prompts }
    });
    Object.assign(prompts, data);
    message.success('提示词已保存');
  } catch (error) {
    message.error(error.message || '保存失败');
  } finally {
    savingPrompts.value = false;
  }
}

function resetPrompt(key) {
  dialog.warning({
    title: '恢复默认提示词',
    content: '确定要清除自定义提示词并恢复为默认值？',
    positiveText: '恢复',
    negativeText: '取消',
    onPositiveClick: () => {
      prompts[key] = '';
      savePrompts();
    }
  });
}

// ==================== Game Rules ====================
const gameRules = ref('');
const savingGameRules = ref(false);

async function loadGameRules() {
  try {
    const data = await apiRequest('/api/settings/game-rules');
    gameRules.value = data.game_rules || '';
  } catch (_) {}
}

async function saveGameRules() {
  savingGameRules.value = true;
  try {
    await apiRequest('/api/settings/game-rules', {
      method: 'PUT',
      body: { game_rules: gameRules.value }
    });
    message.success('游戏规则已保存');
  } catch (error) {
    message.error(error.message || '保存失败');
  } finally {
    savingGameRules.value = false;
  }
}

// ==================== Init ====================
function loadAllSettings() {
  loadSiteConfig();
  loadProviders();
  loadPrompts();
  loadGameRules();
}

onMounted(() => {
  if (sessionState.adminVerified) {
    loadAllSettings();
  }
});
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

/* Admin Gate */
.admin-gate {
  max-width: 420px;
  margin: 40px auto;
  text-align: center;
  padding: 40px 30px;
}
.gate-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.gate-title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold);
  margin-bottom: 6px;
}
.gate-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 18px;
}
.gate-form {
  display: flex;
  gap: 8px;
}

/* Settings Layout */
.settings-layout {
  display: flex;
  gap: 24px;
  min-height: 500px;
}

.settings-nav {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 80px;
  align-self: flex-start;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  font-size: 14px;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-bright);
}
.nav-item.active {
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.15), rgba(201, 168, 76, 0.05));
  border-color: var(--gold-dim);
  color: var(--gold);
  font-weight: 600;
}
.nav-icon {
  font-size: 18px;
}

.settings-content {
  flex: 1;
  min-width: 0;
}

/* Section styles */
.settings-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-heading {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold);
  margin-bottom: 6px;
}
.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.6;
}
.section-desc code {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--arcane-bright);
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-item.full-width {
  grid-column: 1 / -1;
}
.form-item label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 0.3px;
}
.form-hint {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.section-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

/* Provider cards */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  padding: 16px;
}
.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.provider-name {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-bright);
  font-weight: 600;
}
.provider-badges {
  display: flex;
  gap: 6px;
}
.provider-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}
.detail-label {
  color: var(--text-secondary);
  min-width: 70px;
}
.detail-value {
  color: var(--text-bright);
  word-break: break-all;
}
.provider-actions {
  display: flex;
  gap: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Model list */
.model-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-bright);
  transition: all 0.15s;
}
.model-item:hover {
  background: var(--bg-elevated);
  color: var(--gold);
}

/* Template vars info */
.template-vars-info {
  padding: 14px 18px;
  margin-bottom: 20px;
}
.template-vars-info h4 {
  color: var(--gold);
  font-size: 14px;
  margin-bottom: 10px;
}
.vars-table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;
}
.vars-table th {
  text-align: left;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  padding: 6px 10px;
  font-weight: 600;
}
.vars-table td {
  padding: 6px 10px;
  color: var(--text-bright);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.vars-table code {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--arcane-bright);
}

/* Prompt editors */
.prompt-editors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.prompt-editor-block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  background: var(--bg-elevated);
}
.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.prompt-header label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-bright);
}

/* Empty hint */
.empty-hint {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* Responsive */
@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
  .settings-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    position: static;
  }
  .nav-item {
    white-space: nowrap;
    padding: 8px 14px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
