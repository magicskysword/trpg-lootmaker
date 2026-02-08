const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { dataDir } = require('../config');

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(dataDir, 'app.sqlite'),
      driver: sqlite3.Database
    });

    const db = await dbPromise;
    await db.exec('PRAGMA foreign_keys = ON;');
  }

  return dbPromise;
}

module.exports = {
  getDb
};
