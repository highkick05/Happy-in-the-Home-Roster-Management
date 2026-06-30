const Database = require('better-sqlite3');
const fs = require('fs');
const dbFile = fs.existsSync('data/dev-database.sqlite') ? 'data/dev-database.sqlite' : (fs.existsSync('data/database.sqlite') ? 'data/database.sqlite' : 'data.db');
const db = new Database(dbFile);
console.log('Using DB:', dbFile);
const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='services'");
const row = stmt.get();
if (row) {
  console.log(row.sql);
} else {
  console.log("No table named services");
}
