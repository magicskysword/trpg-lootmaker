const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = await getDb();

    const dm = await db.get(`
      SELECT id, name, role, color, portrait_path
      FROM characters
      WHERE role = 'GM'
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const plRows = await db.all(`
      SELECT id, name, role, color, portrait_path
      FROM characters
      WHERE role = 'PL'
      ORDER BY created_at ASC
    `);

    const totalItemValueRow = await db.get(`
      SELECT COALESCE(SUM(quantity * unit_price), 0) AS total
      FROM items
    `);
    const currentCashRow = await db.get(`
      SELECT COALESCE(SUM(quantity * unit_price), 0) AS total
      FROM items
      WHERE type = '金钱'
    `);

    const incomeRows = await db.all('SELECT gold_snapshot FROM loot_records');
    let totalGpIncome = 0;
    for (const row of incomeRows) {
      try {
        const parsed = JSON.parse(row.gold_snapshot || '[]');
        if (Array.isArray(parsed)) {
          totalGpIncome += parsed.reduce((sum, x) => sum + Number(x.amount || 0), 0);
        }
      } catch (_) {
        continue;
      }
    }

    const plValues = await db.all(`
      SELECT c.id AS character_id, c.name AS character_name, c.color,
             COALESCE(SUM(a.quantity * i.unit_price), 0) AS total_value
      FROM characters c
      LEFT JOIN item_allocations a ON a.character_id = c.id
      LEFT JOIN items i ON i.id = a.item_id
      WHERE c.role = 'PL'
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `);

    const campaignRow = await db.get("SELECT value FROM app_settings WHERE key = 'campaign_name'");

    res.json({
      dm: dm || null,
      plCharacters: plRows,
      metrics: {
        totalGpIncome,
        totalItemValue: Number(totalItemValueRow?.total || 0),
        currentCash: Number(currentCashRow?.total || 0)
      },
      plValues,
      campaign_name: campaignRow?.value || ''
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
