const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_hub_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        media_url TEXT,
        requires_expiry INTEGER DEFAULT 0,
        upload_required INTEGER DEFAULT 1,
        is_mandatory INTEGER DEFAULT 1,
        expiry_years INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
      );
  `);
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message);
}
