const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');

const config = require('./config');
const { getDb } = require('./db');
const { initDb } = require('./db/init');
const { cleanupTempDirs } = require('./services/tempCleanup');
const { mergeMoneyItems } = require('./services/itemMerge');
const { requireLogin, requireAdmin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const characterRoutes = require('./routes/characters');
const itemRoutes = require('./routes/items');
const lootRoutes = require('./routes/loot');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const transactionRoutes = require('./routes/transactions');

const SQLiteStore = SQLiteStoreFactory(session);

async function bootstrap() {
  await initDb();
  const db = await getDb();
  const mergedGroups = await mergeMoneyItems(db);
  const mergedCount = mergedGroups.filter((x) => x.merged).length;
  if (mergedCount > 0) {
    console.log(`Startup merge completed: ${mergedCount} 金钱分组已合并`);
  }
  cleanupTempDirs();
  setInterval(cleanupTempDirs, 12 * 60 * 60 * 1000);

  const app = express();

  const devOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? false : devOrigin,
      credentials: true
    })
  );

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use(
    session({
      name: 'trpg_loot_sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: config.dataDir
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: config.sessionMaxAgeMs
      }
    })
  );

  app.use('/images', express.static(config.imageDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', requireLogin, dashboardRoutes);
  app.use('/api/characters', requireLogin, characterRoutes);
  app.use('/api/items', requireLogin, itemRoutes);
  app.use('/api/loot-records', requireLogin, lootRoutes);
  app.use('/api/ai', requireLogin, aiRoutes);
  app.use('/api/transactions', requireLogin, transactionRoutes);
  app.use('/api/settings', requireAdmin, settingsRoutes);

  // Public app config endpoint (no auth required — used by LoginPage and MainLayout)
  app.get('/api/app-config', async (req, res, next) => {
    try {
      const { getDb } = require('./db');
      const db = await getDb();
      const keys = ['campaign_name', 'app_title', 'app_subtitle', 'gm_display_name'];
      const rows = await db.all(
        `SELECT key, value FROM app_settings WHERE key IN (${keys.map(() => '?').join(',')})`,
        keys
      );
      const map = {};
      for (const r of rows) map[r.key] = r.value;
      return res.json({
        campaign_name: map.campaign_name || '',
        app_title: map.app_title || '',
        app_subtitle: map.app_subtitle || '',
        gm_display_name: map.gm_display_name || 'GM'
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(config.frontendDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      return res.sendFile(path.join(config.frontendDistDir, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ message: '接口不存在' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
      message: '服务器内部错误',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
