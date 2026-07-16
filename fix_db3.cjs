const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Created notifications table");
} catch(e) {
  console.log("Failed to create notifications:", e.message);
}
console.log("Done fixing DB 3.");
