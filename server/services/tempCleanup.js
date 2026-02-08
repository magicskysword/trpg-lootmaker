const fs = require('fs');
const path = require('path');
const { tempDir, tempRetentionDays } = require('../config');

function cleanupTempDirs() {
  if (!fs.existsSync(tempDir)) {
    return;
  }

  const now = Date.now();
  const expireMs = tempRetentionDays * 24 * 60 * 60 * 1000;

  for (const name of fs.readdirSync(tempDir)) {
    const full = path.join(tempDir, name);
    const stat = fs.statSync(full);
    if (!stat.isDirectory()) {
      continue;
    }

    if (now - stat.mtimeMs > expireMs) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

module.exports = {
  cleanupTempDirs
};
