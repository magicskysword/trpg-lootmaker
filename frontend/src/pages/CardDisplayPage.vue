<template>
  <div class="card-display-page">
    <!-- Ambient Particles -->
    <div class="particle-bg">
      <span v-for="i in 25" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <h2 class="page-title">🃏 冒险者装备一览</h2>

    <div v-if="!plCharacters.length" class="empty-state-full">
      <div class="empty-emblem">⚔</div>
      <p>冒险尚未开始…暂无PL角色</p>
    </div>

    <div v-else class="card-scroll" ref="scrollContainer">
      <section
        v-for="character in plCharacters"
        :key="character.id"
        class="character-column"
        :style="{ '--char-color': character.color }"
      >
        <!-- Character Header -->
        <div class="column-header">
          <div class="portrait-frame">
            <div class="portrait-glow"></div>
            <img
              v-if="character.portrait_path"
              :src="character.portrait_path"
              class="portrait-img"
              alt=""
            />
            <div v-else class="portrait-placeholder" :style="{ background: character.color }">
              {{ character.name.slice(0, 1) }}
            </div>
          </div>
          <h3 class="char-display-name">{{ character.name }}</h3>
          <div class="char-total-gp">💰 {{ charTotalGp(character).toFixed(1) }} gp</div>
          <div class="char-title-line">
            <span></span><span class="diamond">◆</span><span></span>
          </div>
        </div>

        <!-- Buffs Section -->
        <div v-if="character.buffs?.length" class="display-section">
          <div class="section-header-display">
            <span class="section-icon">🛡</span>
            <span>增益效果</span>
          </div>
          <div class="buff-display-list">
            <div
              v-for="buff in character.buffs"
              :key="buff.id"
              class="buff-display-item"
            >
              <span class="buff-level-indicator" :class="buffLevelClass(buff.level)">
                {{ buffLevelIcon(buff.level) }}
              </span>
              <div class="buff-display-info">
                <div class="buff-display-name">{{ buff.name }}</div>
                <div class="buff-display-meta">{{ buff.level }} {{ buff.resource_note ? '· ' + buff.resource_note : '' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Equipment Section -->
        <div class="display-section">
          <div class="section-header-display">
            <span class="section-icon">⚔</span>
            <span>装备</span>
          </div>
          <div v-if="!grouped(character).equipment.length" class="mini-empty">无装备</div>
          <div v-else class="items-display-list">
            <article
              v-for="item in grouped(character).equipment"
              :key="item.item_id"
              class="item-display-card equipment"
            >
              <div class="item-display-header">
                <span class="item-display-name">{{ item.name }}</span>
                <span class="item-qty" v-if="item.quantity > 1">×{{ item.quantity }}</span>
              </div>
              <div class="item-display-details">
                <span v-if="item.slot" class="slot-indicator">📌 {{ item.slot }}</span>
                <span class="price-indicator">💰 {{ item.unit_price }} gp</span>
              </div>
              <div
                v-if="item.display_description || item.description"
                class="item-display-desc"
                v-html="item.display_description || item.description"
              ></div>
            </article>
          </div>
        </div>

        <!-- Consumables Section -->
        <div class="display-section">
          <div class="section-header-display">
            <span class="section-icon">🧪</span>
            <span>药水 / 卷轴</span>
          </div>
          <div v-if="!grouped(character).consumables.length" class="mini-empty">无消耗品</div>
          <div v-else class="items-display-list">
            <article
              v-for="item in grouped(character).consumables"
              :key="item.item_id"
              class="item-display-card consumable"
            >
              <div class="item-display-header">
                <span class="item-display-name">{{ item.name }}</span>
                <span class="item-qty" v-if="item.quantity > 1">×{{ item.quantity }}</span>
              </div>
              <div class="item-display-details">
                <span class="type-indicator">{{ item.type === '药水' ? '🧪' : '📜' }} {{ item.type }}</span>
                <span class="price-indicator" v-if="item.unit_price">💰 {{ item.unit_price }} gp</span>
              </div>
              <div
                v-if="item.display_description || item.description"
                class="item-display-desc"
                v-html="item.display_description || item.description"
              ></div>
            </article>
          </div>
        </div>

        <!-- Others Section -->
        <div class="display-section">
          <div class="section-header-display">
            <span class="section-icon">📦</span>
            <span>其他物品</span>
          </div>
          <div v-if="!grouped(character).others.length" class="mini-empty">无其他物品</div>
          <div v-else class="items-display-list">
            <article
              v-for="item in grouped(character).others"
              :key="item.item_id"
              class="item-display-card other"
            >
              <div class="item-display-header">
                <span class="item-display-name">{{ item.name }}</span>
                <span class="item-qty" v-if="item.quantity > 1">×{{ item.quantity }}</span>
              </div>
              <div
                v-if="item.display_description || item.description"
                class="item-display-desc"
                v-html="item.display_description || item.description"
              ></div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { apiRequest } from '../utils/api';

const message = useMessage();
const loading = ref(false);
const characters = ref([]);
const scrollContainer = ref(null);

const plCharacters = computed(() => characters.value.filter((x) => x.role === 'PL'));

function charTotalGp(character) {
  return (character.items || []).reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
}

function grouped(character) {
  const equipment = [];
  const consumables = [];
  const others = [];
  for (const item of character.items || []) {
    if (item.type === '装备') equipment.push(item);
    else if (item.type === '药水' || item.type === '卷轴') consumables.push(item);
    else others.push(item);
  }
  return { equipment, consumables, others };
}

function buffLevelClass(level) {
  const map = { '天级': 'day', '小时级': 'hour', '十分钟级': 'tenmin', '分钟级': 'minute', '轮级': 'round' };
  return map[level] || 'day';
}

function buffLevelIcon(level) {
  const map = { '天级': '☀', '小时级': '⏳', '十分钟级': '⏱', '分钟级': '⏰', '轮级': '🔄' };
  return map[level] || '✦';
}

function particleStyle(i) {
  const left = Math.random() * 100;
  const delay = Math.random() * 12;
  const duration = 8 + Math.random() * 12;
  const size = 1 + Math.random() * 3;
  const hue = Math.random() > 0.5 ? '45' : '260';
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    background: `hsl(${hue}, 70%, 60%)`,
  };
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
.card-display-page {
  position: relative;
  min-height: 80vh;
}

/* Empty state */
.empty-state-full {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--text-secondary);
}
.empty-emblem {
  font-size: 72px;
  opacity: 0.3;
  animation: float 4s ease-in-out infinite;
}
.empty-state-full p {
  font-size: 18px;
  margin-top: 16px;
  letter-spacing: 2px;
}

/* Scroll container */
.card-scroll {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 16px;
  scroll-snap-type: x mandatory;
}

/* Character column */
.character-column {
  flex: 1 1 0;
  min-width: 280px;
  scroll-snap-align: start;
  background: linear-gradient(180deg,
    rgba(30, 34, 64, 0.9) 0%,
    rgba(26, 30, 55, 0.95) 50%,
    rgba(22, 26, 48, 0.9) 100%
  );
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  animation: fadeIn 0.6s ease-out forwards;
}

.character-column::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--char-color), transparent);
}

.character-column::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--char-color) 8%, transparent), transparent 70%);
  pointer-events: none;
}

/* Character Header */
.column-header {
  text-align: center;
  padding: 28px 20px 16px;
  position: relative;
  z-index: 1;
}

.portrait-frame {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}

.portrait-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, var(--char-color), var(--gold-dim), var(--char-color));
  opacity: 0.4;
  animation: pulseGlow 3s ease-in-out infinite;
  filter: blur(3px);
}

.portrait-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--char-color);
  position: relative;
  z-index: 1;
  box-shadow:
    0 0 20px color-mix(in srgb, var(--char-color) 30%, transparent),
    0 0 40px color-mix(in srgb, var(--char-color) 15%, transparent);
}

.portrait-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 40px;
  font-family: 'Cinzel', serif;
  color: #fff;
  position: relative;
  z-index: 1;
  border: 3px solid rgba(255,255,255,0.2);
}

.char-display-name {
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-bright);
  margin: 0;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  letter-spacing: 2px;
}

.char-total-gp {
  font-size: 14px;
  color: var(--gold);
  margin-top: 4px;
  font-weight: 600;
  letter-spacing: 1px;
}

.char-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 20px;
}
.char-title-line span:first-child,
.char-title-line span:last-child {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--char-color));
}
.char-title-line span:last-child {
  background: linear-gradient(90deg, var(--char-color), transparent);
}
.char-title-line .diamond {
  color: var(--char-color);
  font-size: 8px;
  text-shadow: 0 0 8px var(--char-color);
}

/* Display sections */
.display-section {
  padding: 0 16px 16px;
  position: relative;
  z-index: 1;
}

.section-header-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Cinzel', 'LXGW WenKai', serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--gold);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.section-icon {
  font-size: 16px;
}

.mini-empty {
  text-align: center;
  padding: 12px;
  color: var(--text-dim);
  font-size: 13px;
  font-style: italic;
}

/* Item display cards */
.items-display-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-display-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.item-display-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}

.item-display-card.equipment::before {
  background: var(--gold);
}
.item-display-card.consumable::before {
  background: var(--arcane);
}
.item-display-card.other::before {
  background: var(--text-dim);
}

.item-display-card:hover {
  background: rgba(201, 168, 76, 0.05);
  border-color: var(--border-strong);
  transform: translateX(2px);
}

.item-display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-display-name {
  font-weight: 600;
  color: var(--text-bright);
  font-size: 14px;
}

.item-qty {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  color: var(--gold);
  padding: 1px 6px;
  background: var(--gold-glow);
  border-radius: 8px;
}

.item-display-details {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.slot-indicator {
  color: var(--gold-dim);
}

.price-indicator {
  color: var(--gold);
}

.item-display-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-top: 4px;
  border-top: 1px solid rgba(201, 168, 76, 0.08);
}

/* Buff display */
.buff-display-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.buff-display-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(201, 168, 76, 0.1);
  border-radius: var(--radius);
}

.buff-level-indicator {
  font-size: 18px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.buff-level-indicator.day {
  background: rgba(243, 156, 18, 0.15);
}
.buff-level-indicator.hour {
  background: rgba(52, 152, 219, 0.15);
}
.buff-level-indicator.tenmin {
  background: rgba(155, 89, 182, 0.15);
}
.buff-level-indicator.minute {
  background: rgba(46, 204, 113, 0.15);
}
.buff-level-indicator.round {
  background: rgba(231, 76, 60, 0.15);
}

.buff-display-name {
  font-weight: 500;
  color: var(--text-bright);
  font-size: 14px;
}

.buff-display-meta {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
