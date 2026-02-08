<template>
  <div class="split-layout">
    <n-card class="card" title="战役总览" :loading="loading">
      <n-grid cols="1 s:3" responsive="screen" :x-gap="12" :y-gap="12">
        <n-grid-item>
          <n-statistic label="总GP收入" :value="metrics.totalGpIncome" suffix="gp" />
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="仓库总估值" :value="metrics.totalItemValue" suffix="gp" />
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="PL角色数" :value="plCharacters.length" />
        </n-grid-item>
      </n-grid>
    </n-card>

    <n-card class="card" title="DM信息" :loading="loading">
      <n-empty v-if="!dm" description="暂未设置DM角色" />
      <template v-else>
        <n-space align="center">
          <n-avatar :src="dm.portrait_path" :style="{ background: dm.color }" size="large">
            {{ dm.name.slice(0, 1) }}
          </n-avatar>
          <div>
            <div>{{ dm.name }}</div>
            <n-tag type="info" round>DM</n-tag>
          </div>
        </n-space>
      </template>
    </n-card>

    <n-card class="card" title="PL角色价值视图" :loading="loading">
      <n-table striped>
        <thead>
          <tr>
            <th>角色</th>
            <th>估值(gp)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in plValues" :key="row.character_id">
            <td>
              <n-space align="center">
                <span class="dot" :style="{ background: row.color }" />
                <span>{{ row.character_name }}</span>
              </n-space>
            </td>
            <td>{{ Number(row.total_value).toFixed(2) }}</td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

    <n-card class="card" title="PL角色列表" :loading="loading">
      <n-empty v-if="!plCharacters.length" description="暂无PL角色" />
      <n-space v-else vertical>
        <n-space
          v-for="character in plCharacters"
          :key="character.id"
          align="center"
          class="character-row"
        >
          <n-avatar :src="character.portrait_path" :style="{ background: character.color }">
            {{ character.name.slice(0, 1) }}
          </n-avatar>
          <div>{{ character.name }}</div>
        </n-space>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import {
  NCard,
  NGrid,
  NGridItem,
  NStatistic,
  NAvatar,
  NSpace,
  NTag,
  NTable,
  NEmpty,
  useMessage
} from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();
const loading = ref(false);
const dm = ref(null);
const plCharacters = ref([]);
const plValues = ref([]);
const metrics = reactive({
  totalGpIncome: 0,
  totalItemValue: 0
});

async function loadData() {
  loading.value = true;
  try {
    const data = await apiRequest('/api/dashboard');
    dm.value = data.dm;
    plCharacters.value = data.plCharacters || [];
    plValues.value = data.plValues || [];
    metrics.totalGpIncome = Number(data.metrics?.totalGpIncome || 0);
    metrics.totalItemValue = Number(data.metrics?.totalItemValue || 0);
  } catch (error) {
    message.error(error.message || '加载主控制台失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.character-row {
  padding: 8px;
  border-radius: 10px;
  background: #f8fafc;
}
</style>
