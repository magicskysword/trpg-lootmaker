const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { nowIso } = require('../utils/time');

const router = express.Router();

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function distributeQuantities(quantity, characters) {
  const result = [];
  if (!characters.length || quantity <= 0) {
    return result;
  }

  const base = Math.floor(quantity / characters.length);
  let remain = quantity % characters.length;

  for (const character of characters) {
    const amount = base + (remain > 0 ? 1 : 0);
    if (amount > 0) {
      result.push({ characterId: character.id, quantity: amount });
    }
    remain -= 1;
  }

  return result;
}

function weightedDistribute(quantity, characters, getWeight) {
  if (!characters.length || quantity <= 0) {
    return [];
  }

  const weights = characters.map((ch) => Math.max(0.0001, Number(getWeight(ch) || 0)));
  const total = weights.reduce((sum, w) => sum + w, 0);

  const raw = characters.map((ch, idx) => ({
    characterId: ch.id,
    base: (quantity * weights[idx]) / total
  }));

  const floorList = raw.map((x) => ({ ...x, quantity: Math.floor(x.base), frac: x.base - Math.floor(x.base) }));
  let assigned = floorList.reduce((sum, x) => sum + x.quantity, 0);
  let remain = quantity - assigned;

  floorList.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < floorList.length && remain > 0; i += 1) {
    floorList[i].quantity += 1;
    remain -= 1;
  }

  return floorList
    .filter((x) => x.quantity > 0)
    .map((x) => ({ characterId: x.characterId, quantity: x.quantity }));
}

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT id, item_snapshot, gold_snapshot, distribution_snapshot, note, memo_text, created_at, updated_at
      FROM loot_records
      ORDER BY created_at DESC
    `);

    const result = rows.map((row) => ({
      id: row.id,
      item_snapshot: safeParse(row.item_snapshot, []),
      gold_snapshot: safeParse(row.gold_snapshot, []),
      distribution_snapshot: safeParse(row.distribution_snapshot, {}),
      note: row.note,
      memo_text: row.memo_text,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/auto-assign', async (req, res, next) => {
  try {
    const { lootItems = [], rule = 'average', characterWeights = {} } = req.body || {};

    const db = await getDb();
    const characters = await db.all(`
      SELECT id, name
      FROM characters
      WHERE role = 'PL'
      ORDER BY created_at ASC
    `);

    if (!characters.length) {
      return res.status(400).json({ message: '没有可用PL角色用于自动分配' });
    }

    const shuffled = [...characters];
    if (rule === 'random') {
      shuffled.sort(() => Math.random() - 0.5);
    }

    const assignments = [];
    let roundRobinIndex = 0;

    for (const item of lootItems) {
      const quantity = Math.max(0, Math.floor(Number(item.quantity || 0)));
      let alloc = [];

      if (rule === 'round') {
        for (let i = 0; i < quantity; i += 1) {
          const character = characters[(roundRobinIndex + i) % characters.length];
          const found = alloc.find((x) => x.characterId === character.id);
          if (found) {
            found.quantity += 1;
          } else {
            alloc.push({ characterId: character.id, quantity: 1 });
          }
        }
        roundRobinIndex = (roundRobinIndex + quantity) % characters.length;
      } else if (rule === 'value') {
        alloc = weightedDistribute(quantity, characters, () => Math.max(1, Number(item.unit_price || 1)));
      } else if (rule === 'weight') {
        alloc = weightedDistribute(quantity, characters, (ch) => Number(characterWeights[ch.id] || 1));
      } else if (rule === 'random') {
        alloc = distributeQuantities(quantity, shuffled);
      } else {
        alloc = distributeQuantities(quantity, characters);
      }

      assignments.push({
        client_id: item.client_id,
        name: item.name,
        allocations: alloc
      });
    }

    return res.json({ assignments });
  } catch (error) {
    return next(error);
  }
});

router.post('/publish', async (req, res, next) => {
  try {
    const {
      lootItems = [],
      goldItems = [],
      distribution = {},
      note = '',
      memo_text = '',
      mode = 'loot'
    } = req.body || {};

    if (!Array.isArray(lootItems) || lootItems.length === 0) {
      return res.status(400).json({ message: '物品列表不能为空' });
    }

    const db = await getDb();
    const now = nowIso();

    // Calculate total values for transaction record
    const totalItemValue = lootItems.reduce(
      (sum, x) => sum + Number(x.quantity || 0) * Number(x.unit_price || 0), 0
    );
    const totalGpAmount = goldItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);

    await db.exec('BEGIN');
    try {
      if (mode === 'expense') {
        // ===== EXPENSE MODE: Remove items from warehouse, NO loot record =====
        for (const item of lootItems) {
          const warehouseId = item.warehouse_id;
          const qty = Number(item.quantity || 0);
          if (qty <= 0) continue;

          if (warehouseId) {
            // Remove specific item from warehouse
            const existing = await db.get('SELECT id, quantity FROM items WHERE id = ?', [warehouseId]);
            if (existing) {
              const newQty = Number(existing.quantity) - qty;
              if (newQty <= 0) {
                // Delete item and its allocations
                await db.run('DELETE FROM item_allocations WHERE item_id = ?', [warehouseId]);
                await db.run('DELETE FROM items WHERE id = ?', [warehouseId]);
              } else {
                // Reduce quantity
                await db.run('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?', [newQty, now, warehouseId]);
                // Adjust allocations proportionally
                const allocs = await db.all('SELECT id, quantity FROM item_allocations WHERE item_id = ?', [warehouseId]);
                const totalAlloc = allocs.reduce((s, a) => s + Number(a.quantity), 0);
                if (totalAlloc > newQty) {
                  // Need to reduce allocations
                  let remaining = newQty;
                  for (const alloc of allocs) {
                    const newAllocQty = Math.min(Number(alloc.quantity), remaining);
                    if (newAllocQty <= 0) {
                      await db.run('DELETE FROM item_allocations WHERE id = ?', [alloc.id]);
                    } else {
                      await db.run('UPDATE item_allocations SET quantity = ?, updated_at = ? WHERE id = ?', [newAllocQty, now, alloc.id]);
                    }
                    remaining -= newAllocQty;
                  }
                }
              }
            }
          }
          // If no warehouse_id, it's a manual expense entry - just record it in transaction
        }

        // Create transaction record (expense)
        const txId = uuidv4();
        const itemNames = lootItems.map(x => x.name || '未命名').join(', ');
        await db.run(
          `INSERT INTO transactions (id, type, description, gp_amount, item_value, total_value, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [txId, 'expense', `支出: ${itemNames}`, totalGpAmount, totalItemValue, totalGpAmount + totalItemValue, note, now, now]
        );

        await db.exec('COMMIT');
        return res.status(201).json({ message: '支出已记录，物品已从仓库移除' });
      } else {
        // ===== LOOT MODE: Create items + loot record + transaction =====
        for (const item of lootItems) {
          const id = uuidv4();
          const quantity = Number(item.quantity || 0);
          if (quantity <= 0) {
            continue;
          }

          await db.run(
            `INSERT INTO items
            (id, name, type, slot, quantity, unit_price, weight, description, display_description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              item.name || '未命名物品',
              item.type || '其他',
              item.type === '装备' ? item.slot || null : null,
              quantity,
              Number(item.unit_price || 0),
              Number(item.weight || 0),
              item.description || '',
              item.display_description || '',
              now,
              now
            ]
          );

          const allocations = item.allocations || [];
          const sumAllocated = allocations.reduce((sum, x) => sum + Number(x.quantity || 0), 0);
          if (sumAllocated - quantity > 1e-9) {
            throw new Error(`物品 ${item.name || '未命名'} 分配数量超过总数量`);
          }

          for (const alloc of allocations) {
            const allocQty = Number(alloc.quantity || 0);
            if (!alloc.characterId || allocQty <= 0) {
              continue;
            }

            const existsChar = await db.get('SELECT id FROM characters WHERE id = ?', [alloc.characterId]);
            if (!existsChar) {
              continue;
            }

            await db.run(
              `INSERT INTO item_allocations
              (id, item_id, character_id, quantity, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
              [uuidv4(), id, alloc.characterId, allocQty, now, now]
            );
          }
        }

        // Create loot record
        const recordId = uuidv4();
        await db.run(
          `INSERT INTO loot_records
           (id, item_snapshot, gold_snapshot, distribution_snapshot, note, memo_text, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recordId,
            JSON.stringify(lootItems),
            JSON.stringify(goldItems),
            JSON.stringify(distribution),
            note,
            memo_text,
            now,
            now
          ]
        );

        // Create transaction record (income)
        const txId = uuidv4();
        const itemNames = lootItems.map(x => x.name || '未命名').join(', ');
        await db.run(
          `INSERT INTO transactions (id, type, description, gp_amount, item_value, total_value, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [txId, 'income', `Loot: ${itemNames}`, totalGpAmount, totalItemValue, totalGpAmount + totalItemValue, note, now, now]
        );

        await db.exec('COMMIT');
        return res.status(201).json({ id: recordId, message: 'Loot已发布并写入仓库、记录与流水' });
      }
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/memo', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memo_text = '' } = req.body || {};

    const db = await getDb();
    const row = await db.get('SELECT id FROM loot_records WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ message: 'Loot记录不存在' });
    }

    await db.run('UPDATE loot_records SET memo_text = ?, updated_at = ? WHERE id = ?', [memo_text, nowIso(), id]);

    return res.json({ message: '备忘录已更新' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
