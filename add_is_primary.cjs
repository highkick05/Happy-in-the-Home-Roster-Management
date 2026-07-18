const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
  db.exec('ALTER TABLE vehicles ADD COLUMN is_primary INTEGER DEFAULT 0');
  console.log("Added is_primary column");
} catch (e) {
  console.log("Column might already exist: " + e.message);
}
