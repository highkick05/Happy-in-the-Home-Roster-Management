const db = require('better-sqlite3')('data/dev-database.sqlite');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );
    INSERT OR IGNORE INTO positions (name) VALUES ('Support Worker'), ('Enrolled Nurse'), ('Registered Nurse'), ('Administration'), ('Manager');

    CREATE TABLE IF NOT EXISTS onboarding_hub_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        media_url TEXT,
        requires_expiry INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
    );
  `);
  console.log("Positions and onboarding_hub_steps tables created successfully.");

  // Check if additional_positions exists
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    if (!tableInfo.some(c => c.name === 'additional_positions')) {
      db.exec("ALTER TABLE users ADD COLUMN additional_positions TEXT DEFAULT '[]';");
      console.log("Added additional_positions to users.");
    }
  } catch (e) {
    console.log("Error checking/altering users:", e);
  }
} catch (e) {
  console.error("Error creating schema:", e);
}
