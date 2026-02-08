<template>
  <div class="loot-grid">
    <n-card class="card" title="Loot登记面板">
      <n-space vertical size="large">
        <n-space wrap>
          <n-button type="primary" @click="addLootItem">新增Loot项</n-button>
          <n-button @click="addGoldItem">新增金钱项</n-button>
          <n-select v-model:value="autoRule" :options="ruleOptions" style="min-width: 180px" />
          <n-button @click="autoAssign">自动分配</n-button>
          <n-button tertiary type="error" @click="clearDraft">清空草稿</n-button>
          <n-button type="success" :loading="publishing" @click="publishLoot">发布Loot</n-button>
        </n-space>

        <n-alert type="info" :show-icon="false">
          草稿自动保存于浏览器本地。拖动物品行并放到右侧角色卡片可快速分配。
        </n-alert>

        <n-table striped>
          <thead>
            <tr>
              <th>选择</th>
              <th>名称</th>
              <th>类型/槽位</th>
              <th>数量</th>
              <th>单价</th>
              <th>已分配</th>
              <th>剩余</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in lootItems"
              :key="item.client_id"
              draggable="true"
              @dragstart="onDragStart(item)"
            >
              <td>
                <n-checkbox v-model:checked="item.selected" />
              </td>
              <td>
                <n-input v-model:value="item.name" placeholder="Loot名称" />
              </td>
              <td>
                <n-space vertical size="small">
                  <n-select v-model:value="item.type" :options="itemTypeOptions" style="width: 120px" />
                  <n-select
                    v-model:value="item.slot"
                    :options="slotOptions"
                    :disabled="item.type !== '装备'"
                    clearable
                    style="width: 120px"
                  />
                </n-space>
              </td>
              <td><n-input-number v-model:value="item.quantity" :min="1" /></td>
              <td><n-input-number v-model:value="item.unit_price" :min="0" /></td>
              <td>{{ allocated(item) }}</td>
              <td>{{ remaining(item) }}</td>
              <td>
                <n-space size="small">
                  <n-button size="tiny" @click="assignRemaining(item)">分配剩余</n-button>
                  <n-button size="tiny" type="error" tertiary @click="removeLootItem(item.client_id)">
                    删除
                  </n-button>
                </n-space>
              </td>
            </tr>
          </tbody>
        </n-table>

        <div>
          <h3 class="section-subtitle">金钱项（可选）</h3>
          <n-space vertical>
            <n-space v-for="gold in goldItems" :key="gold.client_id" align="center">
              <n-input v-model:value="gold.label" placeholder="例如 GP" style="width: 160px" />
              <n-input-number v-model:value="gold.amount" :min="0" />
              <n-button size="tiny" type="error" tertiary @click="removeGoldItem(gold.client_id)">
                删除
              </n-button>
            </n-space>
          </n-space>
        </div>

        <n-space vertical>
          <n-input
            v-model:value="note"
            type="textarea"
            placeholder="发布备注（会写入Loot记录）"
            :autosize="{ minRows: 2, maxRows: 5 }"
          />
          <n-input
            v-model:value="memoText"
            type="textarea"
            placeholder="纯文本备忘录"
            :autosize="{ minRows: 2, maxRows: 5 }"
          />
        </n-space>
      </n-space>
    </n-card>

    <n-card class="card" title="PL角色卡片（拖拽接收区）">
      <n-space vertical>
        <n-space
          v-for="character in plCharacters"
          :key="character.id"
          class="drop-card"
          :style="{ borderColor: character.color }"
          vertical
          @dragover.prevent
          @drop.prevent="onDrop(character.id)"
        >
          <n-space align="center" justify="space-between">
            <n-space align="center">
              <n-avatar :src="character.portrait_path" :style="{ background: character.color }">
                {{ character.name.slice(0, 1) }}
              </n-avatar>
              <strong>{{ character.name }}</strong>
            </n-space>
          </n-space>

          <n-space wrap>
            <n-tag
              v-for="tag in characterAllocTags(character.id)"
              :key="tag.key"
              :color="{ color: character.color + '22', borderColor: character.color, textColor: '#102a43' }"
            >
              {{ tag.text }}
            </n-tag>
            <n-empty v-if="!characterAllocTags(character.id).length" description="未分配" size="small" />
          </n-space>
        </n-space>
      </n-space>
    </n-card>

    <n-card class="card" title="AI登记到当前草稿">
      <n-space vertical>
        <n-space wrap>
          <n-select
            v-model:value="ai.providerId"
            :options="providerOptions"
            placeholder="选择AI Provider"
            style="min-width: 220px"
          />
          <n-button :loading="ai.loading" @click="parseWithAi">AI解析并追加Loot</n-button>
        </n-space>
        <n-input
          v-model:value="ai.inputText"
          type="textarea"
          placeholder="粘贴原始Loot文本"
          :autosize="{ minRows: 4, maxRows: 10 }"
        />
        <label class="upload-label">
          <input type="file" accept="image/*" @change="onAiImage" />
          上传图片 (可选)
        </label>
        <pre v-if="ai.lastRaw" class="raw-output">{{ ai.lastRaw }}</pre>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  NCard,
  NSpace,
  NButton,
  NSelect,
  NTable,
  NCheckbox,
  NInput,
  NInputNumber,
  NAlert,
  NAvatar,
  NTag,
  NEmpty,
  useMessage
} from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();
const draftKey = 'loot-register-draft-v1';

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

const ruleOptions = [
  { label: '平均分', value: 'average' },
  { label: '按价值', value: 'value' },
  { label: '按角色权重', value: 'weight' },
  { label: '随机', value: 'random' },
  { label: '轮流', value: 'round' }
];

const autoRule = ref('average');
const lootItems = ref([]);
const goldItems = ref([]);
const note = ref('');
const memoText = ref('');
const plCharacters = ref([]);
const providers = ref([]);
const publishing = ref(false);
const draggingClientId = ref('');

const ai = reactive({
  providerId: '',
  inputText: '',
  imageDataUrl: '',
  lastRaw: '',
  loading: false
});

const providerOptions = computed(() =>
  providers.value.map((x) => ({
    label: `${x.name}${x.is_default ? ' (默认)' : ''}`,
    value: x.id
  }))
);

function uid() {
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function newLootItem() {
  return {
    client_id: uid(),
    selected: true,
    name: '',
    type: '其他',
    slot: null,
    quantity: 1,
    unit_price: 0,
    weight: 0,
    description: '',
    display_description: '',
    allocations: []
  };
}

function newGoldItem() {
  return {
    client_id: uid(),
    label: 'GP',
    amount: 0
  };
}

function allocated(item) {
  return (item.allocations || []).reduce((sum, x) => sum + Number(x.quantity || 0), 0);
}

function remaining(item) {
  return Math.max(0, Number(item.quantity || 0) - allocated(item));
}

function addLootItem() {
  lootItems.value.push(newLootItem());
}

function removeLootItem(clientId) {
  lootItems.value = lootItems.value.filter((x) => x.client_id !== clientId);
}

function addGoldItem() {
  goldItems.value.push(newGoldItem());
}

function removeGoldItem(clientId) {
  goldItems.value = goldItems.value.filter((x) => x.client_id !== clientId);
}

function onDragStart(item) {
  draggingClientId.value = item.client_id;
}

function onDrop(characterId) {
  if (!draggingClientId.value) {
    return;
  }

  const item = lootItems.value.find((x) => x.client_id === draggingClientId.value);
  if (!item) {
    return;
  }

  const left = remaining(item);
  if (left <= 0) {
    message.warning('该Loot项已无剩余可分配');
    return;
  }

  assignItem(item, characterId, left, true);
  draggingClientId.value = '';
}

function assignItem(item, characterId, quantity, replace = false) {
  const allocs = item.allocations || [];
  if (replace) {
    item.allocations = [{ characterId, quantity }];
    return;
  }

  const found = allocs.find((x) => x.characterId === characterId);
  if (found) {
    found.quantity += quantity;
  } else {
    allocs.push({ characterId, quantity });
  }

  item.allocations = allocs;
}

function assignRemaining(item) {
  if (!plCharacters.value.length) {
    message.warning('暂无PL角色可分配');
    return;
  }

  const left = remaining(item);
  if (left <= 0) {
    message.warning('没有剩余数量可分配');
    return;
  }

  const first = plCharacters.value[0].id;
  assignItem(item, first, left, false);
}

function characterAllocTags(characterId) {
  const tags = [];
  for (const item of lootItems.value) {
    for (const alloc of item.allocations || []) {
      if (alloc.characterId === characterId && Number(alloc.quantity) > 0) {
        tags.push({
          key: `${item.client_id}_${characterId}`,
          text: `${item.name || '未命名'} x${alloc.quantity}`
        });
      }
    }
  }
  return tags;
}

function serializeDraft() {
  return {
    lootItems: lootItems.value,
    goldItems: goldItems.value,
    note: note.value,
    memoText: memoText.value,
    autoRule: autoRule.value
  };
}

function loadDraft() {
  const text = localStorage.getItem(draftKey);
  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text);
    lootItems.value = Array.isArray(parsed.lootItems) ? parsed.lootItems : [];
    goldItems.value = Array.isArray(parsed.goldItems) ? parsed.goldItems : [];
    note.value = parsed.note || '';
    memoText.value = parsed.memoText || '';
    autoRule.value = parsed.autoRule || 'average';
    return true;
  } catch (_) {
    return false;
  }
}

function clearDraft() {
  lootItems.value = [];
  goldItems.value = [];
  note.value = '';
  memoText.value = '';
  autoRule.value = 'average';
  localStorage.removeItem(draftKey);
  message.success('草稿已清空');
}

async function loadCharacters() {
  const rows = await apiRequest('/api/characters');
  plCharacters.value = rows.filter((x) => x.role === 'PL');
}

async function loadProviders() {
  try {
    providers.value = await apiRequest('/api/ai/providers');
    if (!ai.providerId && providers.value.length) {
      ai.providerId = providers.value[0].id;
    }
  } catch (_) {
    providers.value = [];
  }
}

async function autoAssign() {
  const selected = lootItems.value.filter((x) => x.selected);
  if (!selected.length) {
    message.warning('请先勾选要自动分配的Loot项');
    return;
  }

  try {
    const res = await apiRequest('/api/loot-records/auto-assign', {
      method: 'POST',
      body: {
        rule: autoRule.value,
        lootItems: selected.map((x) => ({
          client_id: x.client_id,
          name: x.name,
          quantity: Number(x.quantity || 0),
          unit_price: Number(x.unit_price || 0)
        }))
      }
    });

    for (const assign of res.assignments || []) {
      const item = lootItems.value.find((x) => x.client_id === assign.client_id);
      if (!item) {
        continue;
      }
      item.allocations = (assign.allocations || []).map((x) => ({
        characterId: x.characterId,
        quantity: Number(x.quantity || 0)
      }));
    }

    message.success('已生成自动分配草稿，可继续拖动调整');
  } catch (error) {
    message.error(error.message || '自动分配失败');
  }
}

async function publishLoot() {
  if (!lootItems.value.length) {
    message.warning('请先添加Loot项');
    return;
  }

  for (const item of lootItems.value) {
    if (!item.name) {
      message.warning('存在未填写名称的Loot项');
      return;
    }
    if (Number(item.quantity || 0) <= 0) {
      message.warning(`Loot项 ${item.name} 数量必须大于0`);
      return;
    }
    if (allocated(item) > Number(item.quantity || 0)) {
      message.warning(`Loot项 ${item.name} 分配数量超过总数`);
      return;
    }
  }

  publishing.value = true;
  try {
    await apiRequest('/api/loot-records/publish', {
      method: 'POST',
      body: {
        lootItems: lootItems.value.map((x) => ({
          name: x.name,
          type: x.type,
          slot: x.slot,
          quantity: Number(x.quantity || 0),
          unit_price: Number(x.unit_price || 0),
          weight: Number(x.weight || 0),
          description: x.description || '',
          display_description: x.display_description || '',
          allocations: (x.allocations || []).map((a) => ({
            characterId: a.characterId,
            quantity: Number(a.quantity || 0)
          }))
        })),
        goldItems: goldItems.value.map((x) => ({
          label: x.label,
          amount: Number(x.amount || 0)
        })),
        distribution: {
          rule: autoRule.value
        },
        note: note.value,
        memo_text: memoText.value
      }
    });

    clearDraft();
    message.success('Loot发布成功');
  } catch (error) {
    message.error(error.message || '发布失败');
  } finally {
    publishing.value = false;
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

async function onAiImage(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    ai.imageDataUrl = await fileToDataUrl(file);
    message.success('图片已加载');
  } catch (error) {
    message.error(error.message || '图片处理失败');
  } finally {
    event.target.value = '';
  }
}

async function parseWithAi() {
  if (!ai.inputText && !ai.imageDataUrl) {
    message.warning('请输入文本或图片');
    return;
  }

  ai.loading = true;
  try {
    const data = await apiRequest('/api/ai/parse-loot', {
      method: 'POST',
      body: {
        providerId: ai.providerId || null,
        inputText: ai.inputText,
        imageDataUrl: ai.imageDataUrl
      }
    });

    ai.lastRaw = data.raw_text || '';
    const parsedItems = data.parsed?.loot_items || [];
    const parsedGold = data.parsed?.gold_items || [];

    if (parsedItems.length) {
      for (const x of parsedItems) {
        lootItems.value.push({
          client_id: uid(),
          selected: true,
          name: x.name || '',
          type: x.type || '其他',
          slot: x.slot || null,
          quantity: Number(x.quantity || 1),
          unit_price: Number(x.unit_price || 0),
          weight: Number(x.weight || 0),
          description: x.description || '',
          display_description: x.display_description || '',
          allocations: []
        });
      }
    }

    if (parsedGold.length) {
      for (const x of parsedGold) {
        goldItems.value.push({
          client_id: uid(),
          label: x.label || 'GP',
          amount: Number(x.amount || 0)
        });
      }
    }

    note.value = note.value || data.parsed?.note || '';
    message.success('AI内容已追加到当前草稿');
  } catch (error) {
    message.error(error.message || 'AI解析失败');
  } finally {
    ai.loading = false;
  }
}

watch(
  () => serializeDraft(),
  (value) => {
    localStorage.setItem(draftKey, JSON.stringify(value));
  },
  { deep: true }
);

onMounted(async () => {
  const loaded = loadDraft();
  await Promise.all([loadCharacters(), loadProviders()]);
  if (!loaded && !lootItems.value.length) {
    addLootItem();
  }
});
</script>

<style scoped>
.loot-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 1080px) {
  .loot-grid {
    grid-template-columns: 1fr;
  }
}

.drop-card {
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  padding: 10px;
  background: #f8fafc;
}

.section-subtitle {
  margin: 0 0 8px;
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

.raw-output {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  background: #f8fafc;
  border: 1px solid #d9e2ec;
  border-radius: 10px;
  padding: 10px;
}
</style>
