const express = require('express');
const { getDb } = require('../db');
const { callProvider } = require('../services/aiService');

const router = express.Router();

const DEFAULT_LOOT_TYPES = ['装备', '药水', '卷轴', '金钱', '其他'];
const DEFAULT_SLOT_OPTIONS = [
  '主手', '副手', '盔甲', '盾牌', '披风', '腰带',
  '头环', '头部', '护符', '戒指', '腕部', '胸部',
  '躯体', '眼睛', '脚部', '手套', '手臂', '奇物'
];

// ===== Data Structure Templates =====

const LOOT_STRUCTURE = '{"loot_items":[{"name":"","type":"","slot":null,"quantity":1,"unit_price":0,"weight":0,"description":""}],"note":""}';
const EXPENSE_STRUCTURE = '{"items":[{"seq":1,"quantity":1}]}';
const CHARACTER_STRUCTURE = '{"character":{"name":"","role":"PL","color":"#5B8FF9"},"buffs":[{"level":"天级","name":"","resource_note":"","description":""}],"items":[{"name":"","type":"其他","slot":null,"quantity":1,"unit_price":0,"weight":0,"description":""}]}';

// ===== Default Prompts (used when no custom prompt is configured) =====

const DEFAULT_LOOT_PROMPT = [
  '你是TRPG Loot解析助手。',
  '{{game_rules}}',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{{loot_structure}}',
  '当前仓库已有type：{{types}}。',
  'type必须从上述列表中选择；若不确定，使用"其他"。',
  '当前仓库已有装备槽位：{{slots}}。',
  '当type为"装备"时，slot必须从上述槽位中选择；当type不是"装备"时，slot必须为null。',
  '不要创造新的type或slot。',
  '如果缺失字段，使用合理默认值。'
].join('\n');

const DEFAULT_EXPENSE_PROMPT = [
  '你是TRPG 支出解析助手。',
  '{{game_rules}}',
  '用户会提供一份库存列表，格式为：#序号 物品名 ×数量',
  '用户会告诉你哪些物品需要支出以及支出数量。',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{{expense_structure}}',
  'seq是库存列表中的序号（正整数），quantity是支出数量（正整数）。',
  '所有数量必须使用正数。',
  '只输出用户明确提到要支出的物品，不要输出库存列表中未提及的物品。'
].join('\n');

const DEFAULT_CHARACTER_PROMPT = [
  '你是TRPG 角色资料解析助手。',
  '{{game_rules}}',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{{character_structure}}',
  'role可选：GM、PL、其他。'
].join('\n');

// Export defaults for settings route
const PROMPT_DEFAULTS = {
  prompt_loot: DEFAULT_LOOT_PROMPT,
  prompt_expense: DEFAULT_EXPENSE_PROMPT,
  prompt_character: DEFAULT_CHARACTER_PROMPT
};

// ===== Template Injection =====

async function loadGameRules(db) {
  const row = await db.get("SELECT value FROM app_settings WHERE key = 'game_rules'");
  return row?.value || '';
}

async function loadCustomPrompt(db, key) {
  const row = await db.get('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value || '';
}

function applyTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  // Clean up any remaining empty template vars
  result = result.replace(/\{\{[^}]*\}\}/g, '');
  // Remove blank lines left by empty template vars
  result = result.split('\n').filter(line => line.trim() !== '').join('\n');
  return result;
}

async function loadLootTypeAndSlotContext(db) {
  const typeRows = await db.all(`
    SELECT DISTINCT type
    FROM items
    WHERE type IS NOT NULL AND TRIM(type) <> ''
    ORDER BY type ASC
  `);
  const slotRows = await db.all(`
    SELECT DISTINCT slot
    FROM items
    WHERE slot IS NOT NULL AND TRIM(slot) <> ''
    ORDER BY slot ASC
  `);

  const knownTypes = typeRows
    .map((x) => String(x.type || '').trim())
    .filter(Boolean);
  const knownSlots = slotRows
    .map((x) => {
      const text = String(x.slot || '').trim();
      if (!text) return '';
      if (text.startsWith('戒指')) return '戒指';
      return text;
    })
    .filter(Boolean);

  return {
    types: [...new Set([...DEFAULT_LOOT_TYPES, ...knownTypes])],
    slots: [...new Set([...DEFAULT_SLOT_OPTIONS, ...knownSlots])]
  };
}

async function buildFinalPrompt(db, promptKey, defaultPrompt, extraVars = {}) {
  const customPrompt = await loadCustomPrompt(db, promptKey);
  const template = customPrompt || defaultPrompt;
  const gameRules = await loadGameRules(db);
  return applyTemplate(template, {
    game_rules: gameRules,
    loot_structure: LOOT_STRUCTURE,
    expense_structure: EXPENSE_STRUCTURE,
    character_structure: CHARACTER_STRUCTURE,
    ...extraVars
  });
}


async function getProvider(db, providerId) {
  if (providerId) {
    const row = await db.get('SELECT * FROM ai_providers WHERE id = ?', [providerId]);
    if (row) {
      return row;
    }
  }

  const defaultProvider = await db.get(
    'SELECT * FROM ai_providers WHERE is_default = 1 ORDER BY created_at ASC LIMIT 1'
  );

  if (defaultProvider) {
    return defaultProvider;
  }

  return db.get('SELECT * FROM ai_providers ORDER BY created_at ASC LIMIT 1');
}

async function maybeCaptionImage(db, provider, imageDataUrl) {
  if (!imageDataUrl) {
    return { text: '', imageDataUrl: null };
  }

  if (provider.is_multimodal) {
    return { text: '', imageDataUrl };
  }

  if (!provider.image_caption_provider_id) {
    throw new Error('当前模型非多模态，且未配置图片转述模型');
  }

  const captionProvider = await db.get('SELECT * FROM ai_providers WHERE id = ?', [provider.image_caption_provider_id]);
  if (!captionProvider) {
    throw new Error('图片转述模型配置无效');
  }

  const result = await callProvider(
    captionProvider,
    '你是OCR与信息提取助手，请准确描述图片中的文字、表格和关键数值。输出纯文本。',
    '请描述这张图片中的内容。',
    imageDataUrl
  );

  return {
    text: result.text || '',
    imageDataUrl: null
  };
}

router.get('/providers', async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT id, name, provider_type, model, is_multimodal, is_default
      FROM ai_providers
      ORDER BY is_default DESC, created_at ASC
    `);

    return res.json(
      rows.map((x) => ({
        ...x,
        is_multimodal: Boolean(x.is_multimodal),
        is_default: Boolean(x.is_default)
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.post('/parse-loot', async (req, res, next) => {
  try {
    const { providerId = null, inputText = '', imageDataUrl = '' } = req.body || {};

    if (!inputText && !imageDataUrl) {
      return res.status(400).json({ message: '请输入文本或上传图片' });
    }

    const db = await getDb();
    const provider = await getProvider(db, providerId);
    if (!provider) {
      return res.status(400).json({ message: '请先在设置页配置AI Provider' });
    }
    const lootContext = await loadLootTypeAndSlotContext(db);
    const lootPrompt = await buildFinalPrompt(db, 'prompt_loot', DEFAULT_LOOT_PROMPT, {
      types: JSON.stringify(lootContext.types),
      slots: JSON.stringify(lootContext.slots)
    });

    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, lootPrompt, mergedInput, caption.imageDataUrl);

    return res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        model: provider.model
      },
      parsed: result.parsed,
      raw_text: result.text
    });
  } catch (error) {
    return res.status(400).json({
      message: 'AI解析失败',
      detail: error.response?.data || error.message
    });
  }
});

router.post('/parse-expense', async (req, res, next) => {
  try {
    const { providerId = null, inputText = '', imageDataUrl = '' } = req.body || {};

    if (!inputText && !imageDataUrl) {
      return res.status(400).json({ message: '请输入文本或上传图片' });
    }

    const db = await getDb();
    const provider = await getProvider(db, providerId);
    if (!provider) {
      return res.status(400).json({ message: '请先在设置页配置AI Provider' });
    }

    const expensePrompt = await buildFinalPrompt(db, 'prompt_expense', DEFAULT_EXPENSE_PROMPT);
    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, expensePrompt, mergedInput, caption.imageDataUrl);

    return res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        model: provider.model
      },
      parsed: result.parsed,
      raw_text: result.text
    });
  } catch (error) {
    return res.status(400).json({
      message: 'AI解析失败',
      detail: error.response?.data || error.message
    });
  }
});

router.post('/parse-character', async (req, res, next) => {
  try {
    const { providerId = null, inputText = '', imageDataUrl = '' } = req.body || {};

    if (!inputText && !imageDataUrl) {
      return res.status(400).json({ message: '请输入文本或上传图片' });
    }

    const db = await getDb();
    const provider = await getProvider(db, providerId);
    if (!provider) {
      return res.status(400).json({ message: '请先在设置页配置AI Provider' });
    }

    const characterPrompt = await buildFinalPrompt(db, 'prompt_character', DEFAULT_CHARACTER_PROMPT);
    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, characterPrompt, mergedInput, caption.imageDataUrl);

    return res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        model: provider.model
      },
      parsed: result.parsed,
      raw_text: result.text
    });
  } catch (error) {
    return res.status(400).json({
      message: 'AI解析失败',
      detail: error.response?.data || error.message
    });
  }
});

module.exports = router;
module.exports.PROMPT_DEFAULTS = PROMPT_DEFAULTS;
