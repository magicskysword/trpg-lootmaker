<template>
  <n-card class="card" title="卡片化展示（PL角色）" :loading="loading">
    <n-empty v-if="!plCharacters.length" description="暂无PL角色" />
    <div v-else class="card-scroll">
      <section v-for="character in plCharacters" :key="character.id" class="character-column card">
        <div class="column-head" :style="{ background: character.color + '22' }">
          <n-avatar :src="character.portrait_path" :style="{ background: character.color }" :size="72">
            {{ character.name.slice(0, 1) }}
          </n-avatar>
          <div>
            <h3>{{ character.name }}</h3>
            <n-tag round :color="{ color: character.color + '22', borderColor: character.color }">PL</n-tag>
          </div>
        </div>

        <div class="item-section">
          <h4>装备</h4>
          <n-empty v-if="!grouped(character).equipment.length" size="small" description="无" />
          <n-space v-else vertical>
            <article v-for="item in grouped(character).equipment" :key="item.item_id" class="item-card equip">
              <div class="item-title">{{ item.name }} x{{ item.quantity }}</div>
              <div class="item-meta">槽位: {{ item.slot || '无' }}</div>
              <div class="item-meta">估值: {{ item.unit_price }} gp</div>
            </article>
          </n-space>
        </div>

        <div class="item-section">
          <h4>药水/卷轴</h4>
          <n-empty v-if="!grouped(character).consumables.length" size="small" description="无" />
          <n-space v-else vertical>
            <article v-for="item in grouped(character).consumables" :key="item.item_id" class="item-card">
              <div class="item-title">{{ item.name }} x{{ item.quantity }}</div>
              <div class="item-meta">类型: {{ item.type }}</div>
            </article>
          </n-space>
        </div>

        <div class="item-section">
          <h4>其他</h4>
          <n-empty v-if="!grouped(character).others.length" size="small" description="无" />
          <n-space v-else vertical>
            <article v-for="item in grouped(character).others" :key="item.item_id" class="item-card">
              <div class="item-title">{{ item.name }} x{{ item.quantity }}</div>
              <div class="item-meta">{{ item.description || '无描述' }}</div>
            </article>
          </n-space>
        </div>
      </section>
    </div>
  </n-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { NCard, NAvatar, NTag, NSpace, NEmpty, useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();
const loading = ref(false);
const characters = ref([]);

const plCharacters = computed(() => characters.value.filter((x) => x.role === 'PL'));

function grouped(character) {
  const equipment = [];
  const consumables = [];
  const others = [];

  for (const item of character.items || []) {
    if (item.type === '装备') {
      equipment.push(item);
    } else if (item.type === '药水' || item.type === '卷轴') {
      consumables.push(item);
    } else {
      others.push(item);
    }
  }

  return { equipment, consumables, others };
}

async function loadData() {
  loading.value = true;
  try {
    characters.value = await apiRequest('/api/characters');
  } catch (error) {
    message.error(error.message || '加载卡片展示失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.card-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.character-column {
  min-width: 320px;
  border-radius: 14px;
  padding: 12px;
}

.column-head {
  border-radius: 12px;
  padding: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.column-head h3 {
  margin: 0 0 4px;
}

.item-section {
  margin-top: 12px;
}

.item-section h4 {
  margin: 0 0 8px;
}

.item-card {
  border: 1px solid #d9e2ec;
  border-radius: 10px;
  padding: 8px;
  background: #fff;
}

.item-card.equip {
  background: #f0fdf4;
}

.item-title {
  font-weight: 700;
}

.item-meta {
  color: #486581;
  font-size: 13px;
}
</style>
