const { getDb } = require('./index');

async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'PL',
      color TEXT NOT NULL DEFAULT '#5B8FF9',
      portrait_path TEXT,
      slot_warning_disabled INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS character_buffs (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      level TEXT NOT NULL,
      name TEXT NOT NULL,
      resource_note TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      slot TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      description TEXT,
      display_description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_allocations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
      UNIQUE(item_id, character_id)
    );

    CREATE TABLE IF NOT EXISTS loot_records (
      id TEXT PRIMARY KEY,
      item_snapshot TEXT NOT NULL,
      gold_snapshot TEXT NOT NULL,
      distribution_snapshot TEXT NOT NULL,
      note TEXT,
      memo_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      provider_type TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      model TEXT,
      temperature REAL NOT NULL DEFAULT 1,
      is_multimodal INTEGER NOT NULL DEFAULT 0,
      image_caption_provider_id TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'income',
      description TEXT NOT NULL,
      gp_amount REAL NOT NULL DEFAULT 0,
      item_value REAL NOT NULL DEFAULT 0,
      total_value REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(role);
    CREATE INDEX IF NOT EXISTS idx_allocations_item ON item_allocations(item_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_character ON item_allocations(character_id);
    CREATE INDEX IF NOT EXISTS idx_buffs_character ON character_buffs(character_id);
    CREATE INDEX IF NOT EXISTS idx_loot_created_at ON loot_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
  `);
}

module.exports = {
  initDb
};
