const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { nowIso } = require('../utils/time');

const router = express.Router();

const EQUIP_TYPE = '装备';

async function loadItemsView(db) {
  const items = await db.all(`
    SELECT id, name, type, slot, quantity, unit_price, weight, description, display_description, created_at, updated_at
    FROM items
    ORDER BY created_at DESC
  `);

  const allocations = await db.all(`
    SELECT a.id, a.item_id, a.character_id, a.quantity,
           c.name AS character_name, c.color AS character_color
    FROM item_allocations a
    JOIN characters c ON c.id = a.character_id
    ORDER BY a.created_at ASC
  `);

  const allocMap = new Map();
  for (const row of allocations) {
    const list = allocMap.get(row.item_id) || [];
    list.push({
      id: row.id,
      character_id: row.character_id,
      character_name: row.character_name,
      character_color: row.character_color,
      quantity: Number(row.quantity)
    });
    allocMap.set(row.item_id, list);
  }

  return items.map((item) => {
    const rows = allocMap.get(item.id) || [];
    const allocated = rows.reduce((sum, x) => sum + Number(x.quantity || 0), 0);
    return {
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      weight: Number(item.weight),
      allocations: rows,
      allocated_quantity: allocated,
      remaining_quantity: Number(item.quantity) - allocated
    };
  });
}

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await loadItemsView(db);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      type,
      slot = null,
      quantity = 1,
      unit_price = 0,
      weight = 0,
      description = '',
      display_description = ''
    } = req.body || {};

    if (!name || !type) {
      return res.status(400).json({ message: '名称与类型为必填项' });
    }

    const db = await getDb();
    const id = uuidv4();
    const now = nowIso();

    await db.run(
      `INSERT INTO items
      (id, name, type, slot, quantity, unit_price, weight, description, display_description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        type,
        type === EQUIP_TYPE ? slot : null,
        Number(quantity),
        Number(unit_price),
        Number(weight),
        description,
        display_description,
        now,
        now
      ]
    );

    const created = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    return res.status(201).json({
      ...created,
      quantity: Number(created.quantity),
      unit_price: Number(created.unit_price),
      weight: Number(created.weight),
      allocations: [],
      allocated_quantity: 0,
      remaining_quantity: Number(created.quantity)
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const target = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    if (!target) {
      return res.status(404).json({ message: '物品不存在' });
    }

    const {
      name,
      type,
      slot,
      quantity,
      unit_price,
      weight,
      description,
      display_description
    } = req.body || {};

    const nextType = type ?? target.type;
    const nextSlot = nextType === EQUIP_TYPE ? slot ?? target.slot : null;

    await db.run(
      `UPDATE items
       SET name = ?, type = ?, slot = ?, quantity = ?, unit_price = ?, weight = ?, description = ?, display_description = ?, updated_at = ?
       WHERE id = ?`,
      [
        name ?? target.name,
        nextType,
        nextSlot,
        quantity == null ? target.quantity : Number(quantity),
        unit_price == null ? target.unit_price : Number(unit_price),
        weight == null ? target.weight : Number(weight),
        description ?? target.description,
        display_description ?? target.display_description,
        nowIso(),
        id
      ]
    );

    const updated = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    const allocations = await db.all(
      `SELECT a.id, a.character_id, c.name AS character_name, c.color AS character_color, a.quantity
       FROM item_allocations a
       JOIN characters c ON c.id = a.character_id
       WHERE a.item_id = ?
       ORDER BY a.created_at ASC`,
      [id]
    );

    const allocated = allocations.reduce((sum, row) => sum + Number(row.quantity), 0);

    return res.json({
      ...updated,
      quantity: Number(updated.quantity),
      unit_price: Number(updated.unit_price),
      weight: Number(updated.weight),
      allocations: allocations.map((row) => ({
        id: row.id,
        character_id: row.character_id,
        character_name: row.character_name,
        character_color: row.character_color,
        quantity: Number(row.quantity)
      })),
      allocated_quantity: allocated,
      remaining_quantity: Number(updated.quantity) - allocated
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const target = await db.get('SELECT id FROM items WHERE id = ?', [id]);
    if (!target) {
      return res.status(404).json({ message: '物品不存在' });
    }

    await db.run('DELETE FROM items WHERE id = ?', [id]);
    return res.json({ message: '物品已删除' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/allocations', async (req, res, next) => {
  try {
    const { id: itemId } = req.params;
    const { characterId, quantity = 1, mode = 'merge' } = req.body || {};

    if (!characterId) {
      return res.status(400).json({ message: '缺少角色ID' });
    }

    const db = await getDb();
    const item = await db.get('SELECT * FROM items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    const character = await db.get('SELECT * FROM characters WHERE id = ?', [characterId]);
    if (!character) {
      return res.status(404).json({ message: '角色不存在' });
    }

    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: '分配数量必须大于0' });
    }

    const existingList = await db.all(
      'SELECT * FROM item_allocations WHERE item_id = ? ORDER BY created_at ASC',
      [itemId]
    );

    const same = existingList.find((x) => x.character_id === characterId);
    const totalAssigned = existingList.reduce((sum, x) => sum + Number(x.quantity), 0);
    const assignedToOthers = existingList.filter((x) => x.character_id !== characterId);

    if (Number(item.quantity) <= 1 && assignedToOthers.length > 0 && mode !== 'takeover') {
      return res.status(409).json({
        message: '该物品已分配给其他角色，确认后可抢占分配',
        requires_confirm: true,
        code: 'ITEM_OCCUPIED'
      });
    }

    if (mode === 'takeover') {
      await db.run('DELETE FROM item_allocations WHERE item_id = ? AND character_id <> ?', [itemId, characterId]);
    }

    const currentAmount = same ? Number(same.quantity) : 0;
    const maxAvailable = Number(item.quantity) - (totalAssigned - currentAmount);
    const nextAmount = mode === 'set' || mode === 'takeover' ? amount : currentAmount + amount;

    if (nextAmount > maxAvailable + 1e-9) {
      return res.status(400).json({
        message: `分配数量超出可用数量，当前可用 ${maxAvailable}`
      });
    }

    const now = nowIso();
    if (same) {
      await db.run(
        'UPDATE item_allocations SET quantity = ?, updated_at = ? WHERE id = ?',
        [nextAmount, now, same.id]
      );
    } else {
      await db.run(
        `INSERT INTO item_allocations
         (id, item_id, character_id, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), itemId, characterId, nextAmount, now, now]
      );
    }

    const items = await loadItemsView(db);
    const updated = items.find((x) => x.id === itemId);

    return res.json({ item: updated });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:itemId/allocations/:characterId', async (req, res, next) => {
  try {
    const { itemId, characterId } = req.params;
    const db = await getDb();

    const existing = await db.get(
      'SELECT id FROM item_allocations WHERE item_id = ? AND character_id = ?',
      [itemId, characterId]
    );
    if (!existing) {
      return res.status(404).json({ message: '分配关系不存在' });
    }

    await db.run('DELETE FROM item_allocations WHERE id = ?', [existing.id]);
    const items = await loadItemsView(db);
    const updated = items.find((x) => x.id === itemId);

    return res.json({ item: updated });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
