const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { nowIso } = require('../utils/time');
const { fetchModels } = require('../services/aiService');

const router = express.Router();

function normalizeProvider(row) {
  return {
    ...row,
    is_multimodal: Boolean(row.is_multimodal),
    is_default: Boolean(row.is_default),
    has_api_key: Boolean(row.api_key)
  };
}

router.get('/providers', async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT id, name, provider_type, base_url, api_key, model, temperature,
             is_multimodal, image_caption_provider_id, is_default, created_at, updated_at
      FROM ai_providers
      ORDER BY created_at ASC
    `);

    return res.json(rows.map(normalizeProvider));
  } catch (error) {
    return next(error);
  }
});

router.post('/providers', async (req, res, next) => {
  try {
    const {
      name,
      provider_type = 'openai_compatible',
      base_url,
      api_key = '',
      model = '',
      temperature = 1,
      is_multimodal = false,
      image_caption_provider_id = null,
      is_default = false
    } = req.body || {};

    if (!name || !base_url) {
      return res.status(400).json({ message: '名称与Base URL为必填项' });
    }

    const db = await getDb();
    const now = nowIso();
    const id = uuidv4();

    await db.exec('BEGIN');
    try {
      if (is_default) {
        await db.run('UPDATE ai_providers SET is_default = 0');
      }

      await db.run(
        `INSERT INTO ai_providers
         (id, name, provider_type, base_url, api_key, model, temperature, is_multimodal, image_caption_provider_id, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          provider_type,
          base_url,
          api_key,
          model,
          Number(temperature || 1),
          is_multimodal ? 1 : 0,
          image_caption_provider_id,
          is_default ? 1 : 0,
          now,
          now
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const created = await db.get('SELECT * FROM ai_providers WHERE id = ?', [id]);
    return res.status(201).json(normalizeProvider(created));
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'Provider名称已存在' });
    }
    return next(error);
  }
});

router.put('/providers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const target = await db.get('SELECT * FROM ai_providers WHERE id = ?', [id]);
    if (!target) {
      return res.status(404).json({ message: 'Provider不存在' });
    }

    const payload = req.body || {};

    await db.exec('BEGIN');
    try {
      if (payload.is_default) {
        await db.run('UPDATE ai_providers SET is_default = 0');
      }

      await db.run(
        `UPDATE ai_providers
         SET name = ?, provider_type = ?, base_url = ?, api_key = ?, model = ?, temperature = ?,
             is_multimodal = ?, image_caption_provider_id = ?, is_default = ?, updated_at = ?
         WHERE id = ?`,
        [
          payload.name ?? target.name,
          payload.provider_type ?? target.provider_type,
          payload.base_url ?? target.base_url,
          payload.api_key == null ? target.api_key : payload.api_key,
          payload.model ?? target.model,
          payload.temperature == null ? target.temperature : Number(payload.temperature),
          payload.is_multimodal == null ? target.is_multimodal : payload.is_multimodal ? 1 : 0,
          payload.image_caption_provider_id == null
            ? target.image_caption_provider_id
            : payload.image_caption_provider_id,
          payload.is_default == null ? target.is_default : payload.is_default ? 1 : 0,
          nowIso(),
          id
        ]
      );

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    const updated = await db.get('SELECT * FROM ai_providers WHERE id = ?', [id]);
    return res.json(normalizeProvider(updated));
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'Provider名称已存在' });
    }
    return next(error);
  }
});

router.delete('/providers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const target = await db.get('SELECT * FROM ai_providers WHERE id = ?', [id]);
    if (!target) {
      return res.status(404).json({ message: 'Provider不存在' });
    }

    await db.run('DELETE FROM ai_providers WHERE id = ?', [id]);

    if (target.is_default) {
      const nextDefault = await db.get('SELECT id FROM ai_providers ORDER BY created_at ASC LIMIT 1');
      if (nextDefault) {
        await db.run('UPDATE ai_providers SET is_default = 1 WHERE id = ?', [nextDefault.id]);
      }
    }

    return res.json({ message: 'Provider已删除' });
  } catch (error) {
    return next(error);
  }
});

router.post('/providers/:id/fetch-models', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const provider = await db.get('SELECT * FROM ai_providers WHERE id = ?', [id]);
    if (!provider) {
      return res.status(404).json({ message: 'Provider不存在' });
    }

    const models = await fetchModels(provider);
    return res.json({ models });
  } catch (error) {
    return res.status(400).json({
      message: '拉取模型失败，请检查Base URL / Key / 网络',
      detail: error.response?.data || error.message
    });
  }
});

module.exports = router;
