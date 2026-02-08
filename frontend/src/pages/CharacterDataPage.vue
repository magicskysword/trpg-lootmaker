<template>
  <div class="page-grid">
    <n-card class="card" title="角色管理" :loading="loading.characters">
      <n-space vertical size="large">
        <n-form inline :model="characterForm">
          <n-form-item label="角色名">
            <n-input v-model:value="characterForm.name" placeholder="角色名称" />
          </n-form-item>
          <n-form-item label="身份">
            <n-select v-model:value="characterForm.role" :options="roleOptions" style="width: 120px" />
          </n-form-item>
          <n-form-item label="色系">
            <n-color-picker v-model:value="characterForm.color" size="small" />
          </n-form-item>
          <n-form-item label="禁用槽位警告">
            <n-switch v-model:value="characterForm.slot_warning_disabled" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="saveCharacter">
              {{ characterForm.id ? '更新角色' : '新建角色' }}
            </n-button>
          </n-form-item>
          <n-form-item v-if="characterForm.id">
            <n-button @click="resetCharacterForm">取消编辑</n-button>
          </n-form-item>
        </n-form>

        <n-table striped>
          <thead>
            <tr>
              <th>角色</th>
              <th>身份</th>
              <th>Buff数</th>
              <th>物品数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in characters" :key="row.id">
              <td>
                <n-space align="center" size="small">
                  <n-avatar :src="row.portrait_path" :style="{ background: row.color }">
                    {{ row.name.slice(0, 1) }}
                  </n-avatar>
                  <span>{{ row.name }}</span>
                </n-space>
              </td>
              <td>{{ row.role }}</td>
              <td>{{ row.buffs?.length || 0 }}</td>
              <td>{{ row.items?.length || 0 }}</td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" @click="editCharacter(row)">编辑</n-button>
                  <label class="upload-label">
                    <input type="file" accept="image/*" @change="uploadPortrait($event, row)" />
                    上传立绘
                  </label>
                  <n-button size="tiny" type="error" tertiary @click="removeCharacter(row)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>

        <div>
          <h3 class="section-subtitle">角色Buff</h3>
          <n-space>
            <n-select
              v-model:value="buffForm.characterId"
              :options="characterOptions"
              placeholder="选择角色"
              style="min-width: 180px"
            />
            <n-select
              v-model:value="buffForm.level"
              :options="buffLevelOptions"
              placeholder="持续级别"
              style="min-width: 140px"
            />
            <n-input v-model:value="buffForm.name" placeholder="Buff名称" style="width: 160px" />
            <n-input
              v-model:value="buffForm.resource_note"
              placeholder="资源备注"
              style="width: 180px"
            />
            <n-button type="primary" @click="addBuff">添加Buff</n-button>
          </n-space>

          <n-space v-if="currentBuffCharacter" vertical class="buff-list">
            <n-space
              v-for="buff in currentBuffCharacter.buffs"
              :key="buff.id"
              align="center"
              class="buff-row"
            >
              <n-tag type="info" round>{{ buff.level }}</n-tag>
              <span>{{ buff.name }}</span>
              <span class="muted">{{ buff.resource_note }}</span>
              <n-button size="tiny" type="error" tertiary @click="removeBuff(currentBuffCharacter.id, buff.id)">
                删除
              </n-button>
            </n-space>
          </n-space>
        </div>
      </n-space>
    </n-card>

    <n-card class="card" title="仓库物品" :loading="loading.items">
      <n-space vertical size="large">
        <n-form inline>
          <n-form-item label="名称">
            <n-input v-model:value="itemForm.name" placeholder="物品名称" />
          </n-form-item>
          <n-form-item label="类型">
            <n-select v-model:value="itemForm.type" :options="itemTypeOptions" style="width: 120px" />
          </n-form-item>
          <n-form-item label="槽位">
            <n-select
              v-model:value="itemForm.slot"
              :options="slotOptions"
              :disabled="itemForm.type !== '装备'"
              style="width: 140px"
              clearable
            />
          </n-form-item>
          <n-form-item label="数量">
            <n-input-number v-model:value="itemForm.quantity" :min="0" />
          </n-form-item>
          <n-form-item label="单价">
            <n-input-number v-model:value="itemForm.unit_price" :min="0" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="saveItem">
              {{ itemForm.id ? '更新物品' : '新建物品' }}
            </n-button>
          </n-form-item>
          <n-form-item v-if="itemForm.id">
            <n-button @click="resetItemForm">取消编辑</n-button>
          </n-form-item>
        </n-form>

        <n-table striped>
          <thead>
            <tr>
              <th>名称</th>
              <th>类型/槽位</th>
              <th>数量</th>
              <th>已分配</th>
              <th>剩余</th>
              <th>拥有者</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in items" :key="row.id" :style="itemRowStyle(row)">
              <td>{{ row.name }}</td>
              <td>{{ row.type }} <span v-if="row.slot">/ {{ row.slot }}</span></td>
              <td>{{ row.quantity }}</td>
              <td>{{ row.allocated_quantity }}</td>
              <td>{{ row.remaining_quantity }}</td>
              <td>
                <n-space size="small" wrap>
                  <n-tag
                    v-for="alloc in row.allocations"
                    :key="alloc.character_id"
                    :color="{ color: alloc.character_color + '22', textColor: '#102a43', borderColor: alloc.character_color }"
                    closable
                    @close="removeAllocation(row.id, alloc.character_id)"
                  >
                    {{ alloc.character_name }} x{{ alloc.quantity }}
                  </n-tag>
                </n-space>
              </td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" @click="editItem(row)">编辑</n-button>
                  <n-button size="tiny" @click="openAllocate(row)">分配</n-button>
                  <n-button size="tiny" type="error" tertiary @click="removeItem(row)">删除</n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>

        <n-modal v-model:show="allocationModal" preset="card" title="分配物品" style="max-width: 480px">
          <n-space vertical>
            <div>物品：{{ allocationState.item?.name }}</div>
            <n-select
              v-model:value="allocationState.characterId"
              :options="characterOptions"
              placeholder="选择角色"
            />
            <n-input-number v-model:value="allocationState.quantity" :min="1" />
            <n-radio-group v-model:value="allocationState.mode">
              <n-space>
                <n-radio value="set">覆盖设定</n-radio>
                <n-radio value="merge">叠加分配</n-radio>
                <n-radio value="takeover">抢占分配</n-radio>
              </n-space>
            </n-radio-group>
            <n-space justify="end">
              <n-button @click="allocationModal = false">取消</n-button>
              <n-button type="primary" @click="submitAllocation">提交</n-button>
            </n-space>
          </n-space>
        </n-modal>
      </n-space>
    </n-card>

    <n-card class="card" title="Loot记录备忘录" :loading="loading.lootRecords">
      <n-empty v-if="!lootRecords.length" description="暂无Loot记录" />
      <n-space v-else vertical>
        <div v-for="record in lootRecords" :key="record.id" class="loot-record-row">
          <n-space justify="space-between" align="center">
            <strong>{{ formatDate(record.created_at) }}</strong>
            <n-tag type="info">物品 {{ record.item_snapshot.length }} 条</n-tag>
          </n-space>
          <div class="muted">备注：{{ record.note || '无' }}</div>
          <n-input
            type="textarea"
            :value="record.memo_text"
            @update:value="(v) => (record.memo_text = v)"
            placeholder="可编辑备忘录（不会回写仓库）"
          />
          <n-button size="small" @click="saveRecordMemo(record)">保存备忘录</n-button>
        </div>
      </n-space>
    </n-card>

    <n-card class="card" title="AI录入" :loading="loading.aiProviders">
      <n-space vertical>
        <n-space>
          <n-select
            v-model:value="aiForm.providerId"
            :options="aiProviderOptions"
            placeholder="选择AI Provider"
            style="min-width: 240px"
          />
          <n-button :loading="loading.aiParse" @click="parseLootByAi">解析为Loot</n-button>
          <n-button :loading="loading.aiParse" @click="parseCharacterByAi">解析为角色</n-button>
        </n-space>
        <n-input
          v-model:value="aiForm.inputText"
          type="textarea"
          placeholder="输入原始文本"
          :autosize="{ minRows: 6, maxRows: 14 }"
        />
        <label class="upload-label">
          <input type="file" accept="image/*" @change="onAiImageChange" />
          上传图片 (可选)
        </label>
        <n-space>
          <n-button tertiary type="primary" @click="applyAiLoot">将AI Loot录入仓库</n-button>
          <n-button tertiary type="primary" @click="applyAiCharacter">将AI角色录入系统</n-button>
        </n-space>
        <n-alert v-if="aiForm.rawText" type="info" title="模型原始输出" :show-icon="false">
          <pre class="json-view">{{ aiForm.rawText }}</pre>
        </n-alert>
        <n-alert v-if="aiForm.parsed" type="success" title="解析JSON" :show-icon="false">
          <pre class="json-view">{{ JSON.stringify(aiForm.parsed, null, 2) }}</pre>
        </n-alert>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  NCard,
  NSpace,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NColorPicker,
  NSwitch,
  NButton,
  NTable,
  NAvatar,
  NTag,
  NInputNumber,
  NModal,
  NRadioGroup,
  NRadio,
  NEmpty,
  NAlert,
  useMessage
} from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();

const loading = reactive({
  characters: false,
  items: false,
  lootRecords: false,
  aiProviders: false,
  aiParse: false
});

const characters = ref([]);
const items = ref([]);
const lootRecords = ref([]);
const aiProviders = ref([]);

const roleOptions = [
  { label: 'DM', value: 'DM' },
  { label: 'PL', value: 'PL' },
  { label: '其他', value: '其他' }
];

const itemTypeOptions = [
  { label: '装备', value: '装备' },
  { label: '药水', value: '药水' },
  { label: '卷轴', value: '卷轴' },
  { label: '其他', value: '其他' }
];

const slotOptions = [
  '主手',
  '副手',
  '盔甲',
  '盾牌',
  '披风',
  '腰带',
  '头环',
  '头部',
  '护符',
  '戒指1',
  '戒指2',
  '腕部',
  '胸部',
  '躯体',
  '眼睛',
  '脚部',
  '手套',
  '手臂',
  '奇物'
].map((x) => ({ label: x, value: x }));

const buffLevelOptions = ['天级', '小时级', '十分钟级', '分钟级', '轮级'].map((x) => ({
  label: x,
  value: x
}));

const characterForm = reactive({
  id: '',
  name: '',
  role: 'PL',
  color: '#5B8FF9',
  notes: '',
  slot_warning_disabled: false
});

const buffForm = reactive({
  characterId: '',
  level: '天级',
  name: '',
  resource_note: ''
});

const itemForm = reactive({
  id: '',
  name: '',
  type: '其他',
  slot: null,
  quantity: 1,
  unit_price: 0,
  weight: 0,
  description: '',
  display_description: ''
});

const allocationModal = ref(false);
const allocationState = reactive({
  item: null,
  characterId: '',
  quantity: 1,
  mode: 'set'
});

const aiForm = reactive({
  providerId: '',
  inputText: '',
  imageDataUrl: '',
  parsed: null,
  rawText: ''
});

const characterOptions = computed(() =>
  characters.value.map((x) => ({ label: `${x.name}(${x.role})`, value: x.id }))
);

const currentBuffCharacter = computed(() =>
  characters.value.find((x) => x.id === buffForm.characterId) || null
);

const aiProviderOptions = computed(() =>
  aiProviders.value.map((x) => ({
    label: `${x.name}${x.is_default ? ' (默认)' : ''}`,
    value: x.id
  }))
);

function resetCharacterForm() {
  characterForm.id = '';
  characterForm.name = '';
  characterForm.role = 'PL';
  characterForm.color = '#5B8FF9';
  characterForm.notes = '';
  characterForm.slot_warning_disabled = false;
}

function resetItemForm() {
  itemForm.id = '';
  itemForm.name = '';
  itemForm.type = '其他';
  itemForm.slot = null;
  itemForm.quantity = 1;
  itemForm.unit_price = 0;
  itemForm.weight = 0;
  itemForm.description = '';
  itemForm.display_description = '';
}

function editCharacter(row) {
  characterForm.id = row.id;
  characterForm.name = row.name;
  characterForm.role = row.role;
  characterForm.color = row.color;
  characterForm.notes = row.notes || '';
  characterForm.slot_warning_disabled = Boolean(row.slot_warning_disabled);
}

function editItem(row) {
  itemForm.id = row.id;
  itemForm.name = row.name;
  itemForm.type = row.type;
  itemForm.slot = row.slot;
  itemForm.quantity = row.quantity;
  itemForm.unit_price = row.unit_price;
  itemForm.weight = row.weight;
  itemForm.description = row.description || '';
  itemForm.display_description = row.display_description || '';
}

function openAllocate(row) {
  allocationState.item = row;
  allocationState.characterId = '';
  allocationState.quantity = 1;
  allocationState.mode = 'set';
  allocationModal.value = true;
}

function itemRowStyle(row) {
  if (!row.allocations?.length) {
    return {};
  }

  return {
    background: `${row.allocations[0].character_color}11`
  };
}

function formatDate(v) {
  if (!v) {
    return '';
  }
  return new Date(v).toLocaleString();
}

async function loadCharacters() {
  loading.characters = true;
  try {
    characters.value = await apiRequest('/api/characters');
    if (!buffForm.characterId && characters.value.length) {
      buffForm.characterId = characters.value[0].id;
    }
  } catch (error) {
    message.error(error.message || '加载角色失败');
  } finally {
    loading.characters = false;
  }
}

async function loadItems() {
  loading.items = true;
  try {
    items.value = await apiRequest('/api/items');
  } catch (error) {
    message.error(error.message || '加载物品失败');
  } finally {
    loading.items = false;
  }
}

async function loadLootRecords() {
  loading.lootRecords = true;
  try {
    lootRecords.value = await apiRequest('/api/loot-records');
  } catch (error) {
    message.error(error.message || '加载Loot记录失败');
  } finally {
    loading.lootRecords = false;
  }
}

async function loadAiProviders() {
  loading.aiProviders = true;
  try {
    aiProviders.value = await apiRequest('/api/ai/providers');
    if (!aiForm.providerId && aiProviders.value.length) {
      aiForm.providerId = aiProviders.value[0].id;
    }
  } catch (error) {
    message.warning(error.message || 'AI Provider未配置，可在设置页补充');
  } finally {
    loading.aiProviders = false;
  }
}

async function saveCharacter() {
  if (!characterForm.name) {
    message.warning('请输入角色名');
    return;
  }

  try {
    if (characterForm.id) {
      await apiRequest(`/api/characters/${characterForm.id}`, {
        method: 'PUT',
        body: { ...characterForm }
      });
      message.success('角色已更新');
    } else {
      await apiRequest('/api/characters', {
        method: 'POST',
        body: { ...characterForm }
      });
      message.success('角色已创建');
    }
    resetCharacterForm();
    await loadCharacters();
  } catch (error) {
    message.error(error.message || '保存角色失败');
  }
}

async function removeCharacter(row) {
  const confirmName = window.prompt(`删除角色 ${row.name} 前，请输入完整角色名确认`);
  if (confirmName == null) {
    return;
  }

  try {
    await apiRequest(`/api/characters/${row.id}`, {
      method: 'DELETE',
      body: { confirmName }
    });
    message.success('角色已删除');
    if (characterForm.id === row.id) {
      resetCharacterForm();
    }
    await Promise.all([loadCharacters(), loadItems()]);
  } catch (error) {
    message.error(error.message || '删除角色失败');
  }
}

async function uploadPortrait(event, row) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append('portrait', file);
  try {
    await apiRequest(`/api/characters/${row.id}/portrait`, {
      method: 'POST',
      body: formData
    });
    message.success('立绘上传成功');
    await loadCharacters();
  } catch (error) {
    message.error(error.message || '上传立绘失败');
  } finally {
    event.target.value = '';
  }
}

async function addBuff() {
  if (!buffForm.characterId || !buffForm.level || !buffForm.name) {
    message.warning('请完整填写Buff信息');
    return;
  }

  try {
    await apiRequest(`/api/characters/${buffForm.characterId}/buffs`, {
      method: 'POST',
      body: {
        level: buffForm.level,
        name: buffForm.name,
        resource_note: buffForm.resource_note
      }
    });
    buffForm.name = '';
    buffForm.resource_note = '';
    await loadCharacters();
  } catch (error) {
    message.error(error.message || '添加Buff失败');
  }
}

async function removeBuff(characterId, buffId) {
  try {
    await apiRequest(`/api/characters/${characterId}/buffs/${buffId}`, {
      method: 'DELETE'
    });
    await loadCharacters();
  } catch (error) {
    message.error(error.message || '删除Buff失败');
  }
}

async function saveItem() {
  if (!itemForm.name || !itemForm.type) {
    message.warning('请输入物品名称和类型');
    return;
  }

  try {
    if (itemForm.id) {
      await apiRequest(`/api/items/${itemForm.id}`, {
        method: 'PUT',
        body: { ...itemForm }
      });
      message.success('物品已更新');
    } else {
      await apiRequest('/api/items', {
        method: 'POST',
        body: { ...itemForm }
      });
      message.success('物品已创建');
    }
    resetItemForm();
    await loadItems();
  } catch (error) {
    message.error(error.message || '保存物品失败');
  }
}

async function removeItem(row) {
  if (!window.confirm(`确认删除物品：${row.name} ?`)) {
    return;
  }

  try {
    await apiRequest(`/api/items/${row.id}`, {
      method: 'DELETE'
    });
    message.success('物品已删除');
    await loadItems();
  } catch (error) {
    message.error(error.message || '删除物品失败');
  }
}

async function submitAllocation() {
  if (!allocationState.item || !allocationState.characterId) {
    message.warning('请选择角色');
    return;
  }

  try {
    const data = await apiRequest(`/api/items/${allocationState.item.id}/allocations`, {
      method: 'POST',
      body: {
        characterId: allocationState.characterId,
        quantity: allocationState.quantity,
        mode: allocationState.mode
      }
    });

    if (data.warning) {
      message.warning(data.warning);
    } else {
      message.success('分配成功');
    }

    allocationModal.value = false;
    await loadItems();
  } catch (error) {
    if (error.status === 409 && error.payload?.requires_confirm) {
      const confirmed = window.confirm(`${error.payload.message}，是否改为抢占分配？`);
      if (confirmed) {
        allocationState.mode = 'takeover';
        await submitAllocation();
      }
      return;
    }
    message.error(error.message || '分配失败');
  }
}

async function removeAllocation(itemId, characterId) {
  try {
    await apiRequest(`/api/items/${itemId}/allocations/${characterId}`, {
      method: 'DELETE'
    });
    await loadItems();
  } catch (error) {
    message.error(error.message || '移除分配失败');
  }
}

async function saveRecordMemo(record) {
  try {
    await apiRequest(`/api/loot-records/${record.id}/memo`, {
      method: 'PUT',
      body: {
        memo_text: record.memo_text || ''
      }
    });
    message.success('备忘录已保存');
  } catch (error) {
    message.error(error.message || '保存备忘录失败');
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

async function onAiImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    aiForm.imageDataUrl = await fileToDataUrl(file);
    message.success('图片已加载');
  } catch (error) {
    message.error(error.message || '图片处理失败');
  } finally {
    event.target.value = '';
  }
}

async function parseLootByAi() {
  loading.aiParse = true;
  try {
    const data = await apiRequest('/api/ai/parse-loot', {
      method: 'POST',
      body: {
        providerId: aiForm.providerId || null,
        inputText: aiForm.inputText,
        imageDataUrl: aiForm.imageDataUrl
      }
    });

    aiForm.parsed = data.parsed;
    aiForm.rawText = data.raw_text || '';
    message.success('Loot解析完成');
  } catch (error) {
    message.error(error.message || 'AI解析失败');
  } finally {
    loading.aiParse = false;
  }
}

async function parseCharacterByAi() {
  loading.aiParse = true;
  try {
    const data = await apiRequest('/api/ai/parse-character', {
      method: 'POST',
      body: {
        providerId: aiForm.providerId || null,
        inputText: aiForm.inputText,
        imageDataUrl: aiForm.imageDataUrl
      }
    });

    aiForm.parsed = data.parsed;
    aiForm.rawText = data.raw_text || '';
    message.success('角色解析完成');
  } catch (error) {
    message.error(error.message || 'AI解析失败');
  } finally {
    loading.aiParse = false;
  }
}

async function applyAiLoot() {
  const lootItems = aiForm.parsed?.loot_items;
  if (!Array.isArray(lootItems) || !lootItems.length) {
    message.warning('当前解析结果中没有loot_items');
    return;
  }

  try {
    for (const loot of lootItems) {
      await apiRequest('/api/items', {
        method: 'POST',
        body: {
          name: loot.name,
          type: loot.type || '其他',
          slot: loot.slot || null,
          quantity: Number(loot.quantity || 1),
          unit_price: Number(loot.unit_price || 0),
          weight: Number(loot.weight || 0),
          description: loot.description || '',
          display_description: loot.display_description || ''
        }
      });
    }
    message.success('AI Loot已录入仓库');
    await loadItems();
  } catch (error) {
    message.error(error.message || '录入AI Loot失败');
  }
}

async function applyAiCharacter() {
  const character = aiForm.parsed?.character;
  if (!character?.name) {
    message.warning('当前解析结果中没有角色信息');
    return;
  }

  try {
    const created = await apiRequest('/api/characters', {
      method: 'POST',
      body: {
        name: character.name,
        role: character.role || 'PL',
        color: character.color || '#5B8FF9'
      }
    });

    const buffs = aiForm.parsed?.buffs || [];
    for (const buff of buffs) {
      await apiRequest(`/api/characters/${created.id}/buffs`, {
        method: 'POST',
        body: {
          level: buff.level || '天级',
          name: buff.name || '未命名Buff',
          resource_note: buff.resource_note || '',
          description: buff.description || ''
        }
      });
    }

    const parsedItems = aiForm.parsed?.items || [];
    for (const item of parsedItems) {
      const inserted = await apiRequest('/api/items', {
        method: 'POST',
        body: {
          name: item.name || '未命名物品',
          type: item.type || '其他',
          slot: item.slot || null,
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          weight: Number(item.weight || 0),
          description: item.description || '',
          display_description: item.display_description || ''
        }
      });

      await apiRequest(`/api/items/${inserted.id}/allocations`, {
        method: 'POST',
        body: {
          characterId: created.id,
          quantity: Number(item.quantity || 1),
          mode: 'set'
        }
      });
    }

    message.success('AI角色数据已录入');
    await Promise.all([loadCharacters(), loadItems()]);
  } catch (error) {
    message.error(error.message || '录入AI角色失败');
  }
}

onMounted(async () => {
  await Promise.all([loadCharacters(), loadItems(), loadLootRecords(), loadAiProviders()]);
});
</script>

<style scoped>
.page-grid {
  display: grid;
  gap: 16px;
}

.section-subtitle {
  margin: 0 0 8px;
}

.buff-list {
  margin-top: 8px;
}

.buff-row {
  padding: 8px;
  border: 1px solid #d9e2ec;
  border-radius: 10px;
}

.muted {
  color: #486581;
}

.upload-label {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  border: 1px dashed #94a3b8;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: #334e68;
}

.upload-label input {
  display: none;
}

.loot-record-row {
  border: 1px solid #d9e2ec;
  border-radius: 12px;
  padding: 12px;
}

.json-view {
  margin: 0;
  max-height: 280px;
  overflow: auto;
}
</style>
