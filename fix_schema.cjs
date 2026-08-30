const fs = require('fs');
const dbFile = 'data/dev-database.sqlite';
const db = require('better-sqlite3')(dbFile);
try {
  // Let's create the table if it doesn't exist just in case
  db.prepare(`
    CREATE TABLE IF NOT EXISTS remittances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remittance_number TEXT NOT NULL,
      provider_id INTEGER,
      staff_id INTEGER,
      custom_payee_name TEXT,
      amount REAL NOT NULL,
      file_path TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      services_json TEXT,
      attachments_json TEXT
    );
  `).run();
  console.log("Remittances table created or exists");
  
  db.prepare("ALTER TABLE remittances ADD COLUMN client_id INTEGER").run();
  console.log("Added client_id to remittances");
} catch (e) {
  console.log("Error or already exists:", e.message);
}
