const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      system_name TEXT NOT NULL,
      size INTEGER,
      uploaded_by INTEGER,
      region TEXT,
      folder_path TEXT,
      date_issued TEXT,
      date_expires TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Created files table");
} catch(e) {
  console.log("Failed to create files:", e.message);
}
console.log("Done fixing DB.");
