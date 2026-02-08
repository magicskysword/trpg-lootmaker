const express = require('express');
const { getDb } = require('../db');
const { callProvider } = require('../services/aiService');

const router = express.Router();

const LOOT_PROMPT = [
  '你是Pathfinder 1e Loot解析助手。',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{"loot_items":[{"name":"","type":"","slot":null,"quantity":1,"unit_price":0,"weight":0,"description":""}],"note":""}',
  'type可选：装备、药水、卷轴、金钱、其他。',
  '如果缺失字段，使用合理默认值。'
].join('\n');

const EXPENSE_PROMPT = [
  '你是Pathfinder 1e 支出解析助手。',
  '用户会提供一份库存列表，格式为：#序号 物品名 ×数量',
  '用户会告诉你哪些物品需要支出以及支出数量。',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{"items":[{"seq":1,"quantity":1}]}',
  'seq是库存列表中的序号（正整数），quantity是支出数量（正整数）。',
  '所有数量必须使用正数。',
  '只输出用户明确提到要支出的物品，不要输出库存列表中未提及的物品。'
].join('\n');

const CHARACTER_PROMPT = [
  '你是Pathfinder 1e 角色资料解析助手。',
  '请把输入解析成严格JSON，不要输出任何JSON以外文字。',
  'JSON结构：{"character":{"name":"","role":"PL","color":"#5B8FF9"},"buffs":[{"level":"天级","name":"","resource_note":"","description":""}],"items":[{"name":"","type":"其他","slot":null,"quantity":1,"unit_price":0,"weight":0,"description":""}]}',
  'role可选：GM、PL、其他。'
].join('\n');

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

    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, LOOT_PROMPT, mergedInput, caption.imageDataUrl);

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

    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, EXPENSE_PROMPT, mergedInput, caption.imageDataUrl);

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

    const caption = await maybeCaptionImage(db, provider, imageDataUrl || null);
    const mergedInput = [inputText, caption.text].filter(Boolean).join('\n\n');

    const result = await callProvider(provider, CHARACTER_PROMPT, mergedInput, caption.imageDataUrl);

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
