<template>
  <n-card class="card" title="设置界面（管理员）">
    <template v-if="!sessionState.adminVerified">
      <n-space vertical style="max-width: 420px">
        <n-alert type="warning" :show-icon="false">进入设置页需要管理员密码二次验证。</n-alert>
        <n-input
          v-model:value="adminPassword"
          type="password"
          show-password-on="click"
          placeholder="请输入管理员密码"
        />
        <n-button type="primary" :loading="verifying" @click="verifyAdmin">验证管理员身份</n-button>
      </n-space>
    </template>

    <template v-else>
      <n-space vertical size="large">
        <n-form inline>
          <n-form-item label="名称">
            <n-input v-model:value="form.name" placeholder="Provider名称" />
          </n-form-item>
          <n-form-item label="类型">
            <n-select v-model:value="form.provider_type" :options="typeOptions" style="width: 180px" />
          </n-form-item>
          <n-form-item label="Base URL">
            <n-input v-model:value="form.base_url" placeholder="例如 https://api.openai.com/v1" style="width: 320px" />
          </n-form-item>
          <n-form-item label="API Key">
            <n-input v-model:value="form.api_key" placeholder="可为空" style="width: 240px" />
          </n-form-item>
          <n-form-item label="Model">
            <n-input v-model:value="form.model" placeholder="模型名" style="width: 180px" />
          </n-form-item>
          <n-form-item label="温度">
            <n-input-number v-model:value="form.temperature" :min="0" :max="2" :step="0.1" />
          </n-form-item>
          <n-form-item label="多模态">
            <n-switch v-model:value="form.is_multimodal" />
          </n-form-item>
          <n-form-item label="图片转述Provider">
            <n-select
              v-model:value="form.image_caption_provider_id"
              :options="captionProviderOptions"
              clearable
              style="width: 180px"
            />
          </n-form-item>
          <n-form-item label="默认">
            <n-switch v-model:value="form.is_default" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="saveProvider">
              {{ form.id ? '更新Provider' : '新建Provider' }}
            </n-button>
          </n-form-item>
          <n-form-item v-if="form.id">
            <n-button @click="resetForm">取消编辑</n-button>
          </n-form-item>
        </n-form>

        <n-table striped>
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>Base URL</th>
              <th>Model</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in providers" :key="row.id">
              <td>{{ row.name }}</td>
              <td>{{ row.provider_type }}</td>
              <td>{{ row.base_url }}</td>
              <td>{{ row.model || '-' }}</td>
              <td>
                <n-space>
                  <n-tag v-if="row.is_default" type="success">默认</n-tag>
                  <n-tag v-if="row.is_multimodal" type="info">多模态</n-tag>
                </n-space>
              </td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" @click="editProvider(row)">编辑</n-button>
                  <n-button size="tiny" @click="loadModels(row)">拉取模型</n-button>
                  <n-button size="tiny" type="error" tertiary @click="removeProvider(row)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>

        <n-alert v-if="models.length" type="info" title="可用模型" :show-icon="false">
          <n-space wrap>
            <n-tag v-for="name in models" :key="name" @click="form.model = name" class="clickable-tag">
              {{ name }}
            </n-tag>
          </n-space>
        </n-alert>
      </n-space>
    </template>
  </n-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  NCard,
  NSpace,
  NAlert,
  NInput,
  NButton,
  NForm,
  NFormItem,
  NSelect,
  NInputNumber,
  NSwitch,
  NTable,
  NTag,
  useMessage
} from 'naive-ui';
import { apiRequest } from '../utils/api';
import { refreshSession, sessionState } from '../stores/session';

const message = useMessage();
const verifying = ref(false);
const adminPassword = ref('');
const providers = ref([]);
const models = ref([]);

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
      body: {
        password: adminPassword.value
      }
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
      await apiRequest(`/api/settings/providers/${form.id}`, {
        method: 'PUT',
        body: payload
      });
      message.success('Provider已更新');
    } else {
      await apiRequest('/api/settings/providers', {
        method: 'POST',
        body: payload
      });
      message.success('Provider已创建');
    }

    resetForm();
    await loadProviders();
  } catch (error) {
    message.error(error.message || '保存Provider失败');
  }
}

async function removeProvider(row) {
  if (!window.confirm(`确认删除Provider：${row.name} ?`)) {
    return;
  }

  try {
    await apiRequest(`/api/settings/providers/${row.id}`, {
      method: 'DELETE'
    });
    message.success('Provider已删除');
    await loadProviders();
  } catch (error) {
    message.error(error.message || '删除Provider失败');
  }
}

async function loadModels(row) {
  try {
    const data = await apiRequest(`/api/settings/providers/${row.id}/fetch-models`, {
      method: 'POST'
    });
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
      await loadProviders();
    } catch (error) {
      message.error(error.message || '加载设置失败');
    }
  }
});
</script>

<style scoped>
.clickable-tag {
  cursor: pointer;
}
</style>
