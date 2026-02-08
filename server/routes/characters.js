const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { imageDir } = require('../config');
const { nowIso } = require('../utils/time');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, imageDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const characters = await db.all(
      `SELECT id, name, role, color, portrait_path, notes, created_at, updated_at
       FROM characters
       ORDER BY created_at ASC`
    );

    const buffs = await db.all(
      `SELECT id, character_id, level, name, resource_note, description, created_at, updated_at
       FROM character_buffs
       ORDER BY created_at ASC`
    );

    const allocations = await db.all(`
      SELECT a.character_id, a.item_id, a.quantity,
             i.name, i.type, i.slot, i.unit_price, i.weight, i.description, i.display_description
      FROM item_allocations a
      JOIN items i ON i.id = a.item_id
      ORDER BY i.created_at ASC
    `);

    const buffMap = new Map();
    for (const buff of buffs) {
      const list = buffMap.get(buff.character_id) || [];
      list.push(buff);
      buffMap.set(buff.character_id, list);
    }

    const itemMap = new Map();
    for (const row of allocations) {
      const list = itemMap.get(row.character_id) || [];
      list.push({
        item_id: row.item_id,
        quantity: Number(row.quantity),
        name: row.name,
        type: row.type,
        slot: row.slot,
        unit_price: Number(row.unit_price),
        weight: Number(row.weight),
        description: row.description,
        display_description: row.display_description
      });
      itemMap.set(row.character_id, list);
    }

    res.json(
      characters.map((row) => ({
        ...row,
        buffs: buffMap.get(row.id) || [],
        items: itemMap.get(row.id) || []
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, role = 'PL', color = '#5B8FF9', notes = '' } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: '角色名不能为空' });
    }

    const db = await getDb();
    const id = uuidv4();
    const now = nowIso();

    await db.run(
      `INSERT INTO characters
      (id, name, role, color, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), role, color, notes, now, now]
    );

    const created = await db.get(
      `SELECT id, name, role, color, portrait_path, notes, created_at, updated_at
       FROM characters WHERE id = ?`,
      [id]
    );

    return res.status(201).json({ ...created, buffs: [], items: [] });
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: '角色名已存在' });
    }
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, color, notes } = req.body || {};

    const db = await getDb();
    const exists = await db.get('SELECT * FROM characters WHERE id = ?', [id]);
    if (!exists) {
      return res.status(404).json({ message: '角色不存在' });
    }

    const now = nowIso();
    await db.run(
      `UPDATE characters
       SET name = ?, role = ?, color = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        name ?? exists.name,
        role ?? exists.role,
        color ?? exists.color,
        notes ?? exists.notes,
        now,
        id
      ]
    );

    const updated = await db.get(
      `SELECT id, name, role, color, portrait_path, notes, created_at, updated_at
       FROM characters WHERE id = ?`,
      [id]
    );

    return res.json(updated);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: '角色名已存在' });
    }
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmName } = req.body || {};

    const db = await getDb();
    const target = await db.get('SELECT id, name, portrait_path FROM characters WHERE id = ?', [id]);
    if (!target) {
      return res.status(404).json({ message: '角色不存在' });
    }

    if (!confirmName || confirmName !== target.name) {
      return res.status(400).json({ message: '确认角色名不匹配' });
    }

    await db.run('DELETE FROM characters WHERE id = ?', [id]);

    if (target.portrait_path) {
      const full = path.join(imageDir, path.basename(target.portrait_path));
      if (fs.existsSync(full)) {
        fs.rmSync(full, { force: true });
      }
    }

    return res.json({ message: '角色已删除，并清理分配关系' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/portrait', upload.single('portrait'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: '未上传图片文件' });
    }

    const db = await getDb();
    const target = await db.get('SELECT id, portrait_path FROM characters WHERE id = ?', [id]);
    if (!target) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(404).json({ message: '角色不存在' });
    }

    const rel = `/images/${path.basename(req.file.path)}`;
    const now = nowIso();

    await db.run('UPDATE characters SET portrait_path = ?, updated_at = ? WHERE id = ?', [rel, now, id]);

    if (target.portrait_path) {
      const old = path.join(imageDir, path.basename(target.portrait_path));
      if (fs.existsSync(old)) {
        fs.rmSync(old, { force: true });
      }
    }

    return res.json({ portrait_path: rel });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/buffs', async (req, res, next) => {
  try {
    const { id: characterId } = req.params;
    const { level, name, resource_note = '', description = '' } = req.body || {};

    if (!level || !name) {
      return res.status(400).json({ message: 'Buff等级与名称不能为空' });
    }

    const db = await getDb();
    const character = await db.get('SELECT id FROM characters WHERE id = ?', [characterId]);
    if (!character) {
      return res.status(404).json({ message: '角色不存在' });
    }

    const id = uuidv4();
    const now = nowIso();
    await db.run(
      `INSERT INTO character_buffs
      (id, character_id, level, name, resource_note, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, characterId, level, name, resource_note, description, now, now]
    );

    const created = await db.get('SELECT * FROM character_buffs WHERE id = ?', [id]);
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

router.put('/:characterId/buffs/:buffId', async (req, res, next) => {
  try {
    const { characterId, buffId } = req.params;
    const { level, name, resource_note, description } = req.body || {};

    const db = await getDb();
    const buff = await db.get('SELECT * FROM character_buffs WHERE id = ? AND character_id = ?', [buffId, characterId]);
    if (!buff) {
      return res.status(404).json({ message: 'Buff不存在' });
    }

    await db.run(
      `UPDATE character_buffs
       SET level = ?, name = ?, resource_note = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [
        level ?? buff.level,
        name ?? buff.name,
        resource_note ?? buff.resource_note,
        description ?? buff.description,
        nowIso(),
        buffId
      ]
    );

    const updated = await db.get('SELECT * FROM character_buffs WHERE id = ?', [buffId]);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:characterId/buffs/:buffId', async (req, res, next) => {
  try {
    const { characterId, buffId } = req.params;
    const db = await getDb();

    const buff = await db.get('SELECT id FROM character_buffs WHERE id = ? AND character_id = ?', [buffId, characterId]);
    if (!buff) {
      return res.status(404).json({ message: 'Buff不存在' });
    }

    await db.run('DELETE FROM character_buffs WHERE id = ?', [buffId]);
    return res.json({ message: 'Buff已删除' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
