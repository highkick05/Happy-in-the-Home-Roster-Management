import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

let _filename: string;
let _dirname: string;

if (typeof __dirname !== 'undefined') {
  _dirname = __dirname;
  _filename = __filename;
} else {
  // @ts-ignore
  _filename = fileURLToPath(import.meta.url);
  _dirname = path.dirname(_filename);
}

const isBuilt = _dirname.endsWith('dist');
const rootDir = isBuilt ? path.join(_dirname, '..') : _dirname;

import fs from 'fs';

// Initialize SQLite DB
const dataDir = path.join(rootDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = process.env.NODE_ENV === 'production' 
  ? (process.env.DATABASE_PATH || path.join(dataDir, 'database.sqlite'))
  : path.join(dataDir, 'dev-database.sqlite');

// Backwards compatibility for users upgrading to volume mapping:
const legacyDbFile = process.env.NODE_ENV === 'production' 
  ? path.join(rootDir, 'database.sqlite')
  : path.join(rootDir, 'dev-database.sqlite');

if (!fs.existsSync(dbFile) && fs.existsSync(legacyDbFile)) {
  try {
    fs.copyFileSync(legacyDbFile, dbFile);
    console.log(`Migrated legacy database file to ${dbFile}`);
  } catch (err) {
    console.error('Failed to migrate legacy DB:', err);
  }
}
  
const db = new Database(dbFile);

// Execute recommended PRAGMA statements for robustness against corruption
db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL'); // Safer than NORMAL to ensure transactions are completely persisted
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('temp_store = MEMORY'); // Store temporary tables/indices in memory
db.pragma('cache_size = -20000'); // Use 20MB for cache
db.pragma('mmap_size = 2147483648'); // Use memory mapping for reading (2GB)

// Handle process termination gracefully to cleanly close the database
const closeDb = () => {
  try {
    if (db.open) {
      db.pragma('optimize');
      // Force a WAL checkpoint before closing to ensure all data is written to the main DB file
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('Database connection closed cleanly.');
    }
  } catch (err) {
    console.error('Error closing database:', err);
  }
};

process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });
process.on('exit', closeDb);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  closeDb();
  // // process.exit(1); // Do not crash on unhandled rejection in this environment // Do not crash on uncaught exception in this environment
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  closeDb();
  process.exit(1);
});

export default db;
