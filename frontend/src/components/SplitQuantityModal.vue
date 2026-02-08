<template>
  <n-modal
    :show="show"
    preset="card"
    title="✂ 分割 / 移动数量"
    style="max-width: 400px"
    :bordered="false"
    @update:show="$emit('update:show', $event)"
  >
    <div class="split-body">
      <div class="split-item-name">{{ itemName }}</div>
      <div class="split-info">
        可用数量: <strong>{{ maxQuantity }}</strong>
      </div>
      <div class="form-group">
        <label class="form-label">移动数量</label>
        <n-slider
          v-model:value="quantity"
          :min="1"
          :max="maxQuantity"
          :step="1"
        />
        <n-input-number
          v-model:value="quantity"
          :min="1"
          :max="maxQuantity"
          size="small"
          style="margin-top: 8px"
        />
      </div>
    </div>
    <template #footer>
      <div class="modal-footer">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="onConfirm">
          ✦ 确认移动 ×{{ quantity }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { NModal, NSlider, NInputNumber, NButton } from 'naive-ui';

const props = defineProps({
  show: Boolean,
  itemName: { type: String, default: '' },
  maxQuantity: { type: Number, default: 1 }
});

const emit = defineEmits(['update:show', 'confirm']);
const quantity = ref(1);

watch(() => props.show, (v) => {
  if (v) {
    quantity.value = props.maxQuantity;
  }
});

function onConfirm() {
  emit('confirm', quantity.value);
  emit('update:show', false);
}
</script>

<style scoped>
.split-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.split-item-name {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--gold);
  text-align: center;
}

.split-info {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}
.split-info strong {
  color: var(--text-bright);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  color: var(--gold);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
