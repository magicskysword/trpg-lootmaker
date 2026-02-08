<template>
  <n-modal
    :show="show"
    preset="card"
    :title="isEdit ? '编辑物品详情' : '新建物品'"
    style="max-width: 640px"
    :bordered="false"
    :segmented="{ content: true, footer: true }"
    @update:show="$emit('update:show', $event)"
  >
    <div class="item-edit-form">
      <!-- Row 1: Name + Type -->
      <div class="form-row">
        <div class="form-group flex-2">
          <label class="form-label">名称</label>
          <n-input v-model:value="local.name" placeholder="物品名称" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">类型</label>
          <n-select v-model:value="local.type" :options="itemTypeOptions" />
        </div>
      </div>

      <!-- Row 2: Slot (if equipment) -->
      <div v-if="local.type === '装备'" class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">槽位</label>
          <n-select v-model:value="local.slot" :options="slotOptions" clearable placeholder="选择槽位" />
        </div>
      </div>

      <!-- Row 3: Quantity + Price + Weight -->
      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">数量</label>
          <n-input-number v-model:value="local.quantity" :min="0" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">单价 (gp)</label>
          <n-input-number v-model:value="local.unit_price" :min="0" :precision="2" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">重量 (lb)</label>
          <n-input-number v-model:value="local.weight" :min="0" :precision="2" />
        </div>
      </div>

      <hr class="fantasy-divider" />

      <!-- Description -->
      <div class="form-group">
        <label class="form-label">描述</label>
        <n-input
          v-model:value="local.description"
          type="textarea"
          placeholder="物品描述..."
          :autosize="{ minRows: 3, maxRows: 8 }"
        />
      </div>

      <!-- Display Description -->
      <div class="form-group">
        <label class="form-label">
          显示描述
          <span class="label-hint">（用于卡片展示，为空时使用描述，支持HTML）</span>
        </label>
        <n-input
          v-model:value="local.display_description"
          type="textarea"
          placeholder="支持完整HTML标签..."
          :autosize="{ minRows: 3, maxRows: 10 }"
        />
      </div>

      <!-- Preview -->
      <div v-if="local.display_description" class="preview-section">
        <label class="form-label">预览</label>
        <div class="html-preview" v-html="local.display_description"></div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="onSave">
          {{ isEdit ? '保存修改' : '创建物品' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { NModal, NInput, NSelect, NInputNumber, NButton } from 'naive-ui';

const props = defineProps({
  show: Boolean,
  item: Object
});

const emit = defineEmits(['update:show', 'save']);

const isEdit = computed(() => Boolean(props.item?.id));

import { computed } from 'vue';

const itemTypeOptions = [
  { label: '装备', value: '装备' },
  { label: '药水', value: '药水' },
  { label: '卷轴', value: '卷轴' },
  { label: '其他', value: '其他' }
];

const slotOptions = [
  '主手', '副手', '盔甲', '盾牌', '披风', '腰带',
  '头环', '头部', '护符', '戒指1', '戒指2',
  '腕部', '胸部', '躯体', '眼睛', '脚部',
  '手套', '手臂', '奇物'
].map((x) => ({ label: x, value: x }));

const local = reactive({
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

watch(
  () => props.item,
  (item) => {
    if (item) {
      local.id = item.id || '';
      local.name = item.name || '';
      local.type = item.type || '其他';
      local.slot = item.slot || null;
      local.quantity = item.quantity ?? 1;
      local.unit_price = item.unit_price ?? 0;
      local.weight = item.weight ?? 0;
      local.description = item.description || '';
      local.display_description = item.display_description || '';
    }
  },
  { immediate: true }
);

function onSave() {
  emit('save', { ...local });
}
</script>

<style scoped>
.item-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.form-label {
  font-size: 13px;
  color: var(--gold);
  letter-spacing: 0.5px;
}

.label-hint {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: normal;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.html-preview {
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  min-height: 60px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
