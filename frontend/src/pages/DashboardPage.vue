<template>
  <div class="dashboard">
    <!-- Ambient particles -->
    <div class="particle-bg">
      <span v-for="i in 15" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <h2 class="page-title">🏰 战役总览</h2>

    <!-- Stat row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">{{ formatGp(metrics.totalGpIncome) }}<span class="stat-suffix">gp</span></div>
        <div class="stat-label">总GP收入</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value">{{ formatGp(metrics.totalItemValue) }}<span class="stat-suffix">gp</span></div>
        <div class="stat-label">仓库总估值</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚔</div>
        <div class="stat-value">{{ plCharacters.length }}</div>
        <div class="stat-label">PL角色数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🪙</div>
        <div class="stat-value">{{ formatGp(metrics.currentCash) }}<span class="stat-suffix">gp</span></div>
        <div class="stat-label">当前现金</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- GM Card -->
      <div class="ornate-frame dm-card">
        <h3 class="section-title">🎭 Game Master</h3>
        <div v-if="!dm" class="empty-state">
          <span class="empty-icon">👤</span>
          <span>暂未设置GM角色</span>
        </div>
        <div v-else class="dm-info">
          <div class="dm-avatar-wrap">
            <img v-if="dm.portrait_path" :src="dm.portrait_path" class="dm-avatar" alt="GM" />
            <div v-else class="dm-avatar-placeholder" :style="{ background: dm.color }">
              {{ dm.name.slice(0, 1) }}
            </div>
          </div>
          <div class="dm-details">
            <div class="dm-name">{{ dm.name }}</div>
            <span class="fantasy-badge arcane">GM</span>
          </div>
        </div>
      </div>

      <!-- PL Value Table -->
      <div class="ornate-frame value-table-card">
        <h3 class="section-title">⚖ PL角色价值</h3>
        <div v-if="!plValues.length" class="empty-state">
          <span class="empty-icon">📊</span>
          <span>暂无PL角色数据</span>
        </div>
        <table v-else class="fantasy-table">
          <thead>
            <tr>
              <th>角色</th>
              <th style="text-align:right">估值 (gp)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in plValues" :key="row.character_id" class="value-row">
              <td>
                <div class="char-cell">
                  <span class="color-dot" :style="{ background: row.color }"></span>
                  <span>{{ row.character_name }}</span>
                </div>
              </td>
              <td style="text-align:right; font-family: 'Cinzel', serif; color: var(--gold-bright);">
                {{ formatGp(row.total_value) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PL Character Gallery -->
    <div class="ornate-frame pl-gallery">
      <h3 class="section-title">⚔ 冒险者们</h3>
      <div v-if="!plCharacters.length" class="empty-state">
        <span class="empty-icon">🗡</span>
        <span>暂无PL角色</span>
      </div>
      <div v-else class="character-grid">
        <div
          v-for="character in plCharacters"
          :key="character.id"
          class="character-card"
          :style="{ '--char-color': character.color }"
        >
          <div class="char-portrait-wrap">
            <img v-if="character.portrait_path" :src="character.portrait_path" class="char-portrait" alt="" />
            <div v-else class="char-portrait-placeholder" :style="{ background: character.color }">
              {{ character.name.slice(0, 1) }}
            </div>
          </div>
          <div class="char-info">
            <div class="char-name">{{ character.name }}</div>
            <span class="fantasy-badge gold">PL</span>
          </div>
          <div class="char-glow"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();
const loading = ref(false);
const dm = ref(null);
const plCharacters = ref([]);
const plValues = ref([]);
const metrics = reactive({
  totalGpIncome: 0,
  totalItemValue: 0,
  currentCash: 0
});

function formatGp(v) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function particleStyle(i) {
  const left = Math.random() * 100;
  const delay = Math.random() * 10;
  const duration = 8 + Math.random() * 10;
  const size = 2 + Math.random() * 2;
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

async function loadData() {
  loading.value = true;
  try {
    const data = await apiRequest('/api/dashboard');
    dm.value = data.dm;
    plCharacters.value = data.plCharacters || [];
    plValues.value = data.plValues || [];
    metrics.totalGpIncome = Number(data.metrics?.totalGpIncome || 0);
    metrics.totalItemValue = Number(data.metrics?.totalItemValue || 0);
    metrics.currentCash = Number(data.metrics?.currentCash || 0);
  } catch (error) {
    message.error(error.message || '加载主页失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.dashboard {
  position: relative;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

/* DM Card */
.dm-card {
  display: flex;
  flex-direction: column;
}

.dm-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.dm-avatar-wrap {
  flex-shrink: 0;
}

.dm-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--gold-dim);
  box-shadow: 0 0 20px var(--arcane-glow);
}

.dm-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-family: 'Cinzel', serif;
  color: #fff;
  border: 2px solid var(--gold-dim);
}

.dm-name {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-bright);
  margin-bottom: 4px;
}

/* Value Table */
.fantasy-table {
  width: 100%;
  border-collapse: collapse;
}

.fantasy-table th {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--gold);
  border-bottom: 1px solid var(--border);
  text-align: left;
  letter-spacing: 1px;
}

.fantasy-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(201, 168, 76, 0.08);
}

.fantasy-table tr:hover td {
  background: rgba(201, 168, 76, 0.04);
}

.char-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 36px;
  opacity: 0.5;
}

/* PL Gallery */
.pl-gallery {
  padding: 24px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.character-card {
  position: relative;
  background: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 16px;
  text-align: center;
  transition: all var(--transition);
  overflow: hidden;
}

.character-card:hover {
  transform: translateY(-4px);
  border-color: var(--char-color);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 20px color-mix(in srgb, var(--char-color) 30%, transparent);
}

.character-card:hover .char-glow {
  opacity: 1;
}

.char-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--char-color);
  opacity: 0.4;
  transition: opacity var(--transition);
  box-shadow: 0 0 15px var(--char-color);
}

.char-portrait-wrap {
  margin-bottom: 12px;
}

.char-portrait {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--char-color);
  box-shadow: 0 0 15px color-mix(in srgb, var(--char-color) 30%, transparent);
}

.char-portrait-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 28px;
  font-family: 'Cinzel', serif;
  color: #fff;
  margin: 0 auto;
}

.char-name {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-bright);
  margin-bottom: 6px;
}

.char-info {
  position: relative;
  z-index: 1;
}
</style>
