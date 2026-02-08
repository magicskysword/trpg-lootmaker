const path = require('path');
const fs = require('fs');

require('dotenv').config();

const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'data');
const tempDir = process.env.TEMP_DIR
  ? path.resolve(process.env.TEMP_DIR)
  : path.join(rootDir, 'temp');
const imageDir = path.join(dataDir, 'image');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');

for (const dir of [dataDir, tempDir, imageDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  rootDir,
  dataDir,
  tempDir,
  imageDir,
  frontendDistDir,
  // 端口优先级：APP_PORT（项目统一） > PORT（常见PaaS注入） > 3000
  port: Number(process.env.APP_PORT || process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE_HOURS || 8) * 60 * 60 * 1000,
  userPassword: process.env.USER_PASSWORD || 'player123',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  tempRetentionDays: Number(process.env.TEMP_RETENTION_DAYS || 3)
};
