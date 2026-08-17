import Database from 'better-sqlite3';
import fs from 'fs';

const dbs = ['database.sqlite', 'data/database.sqlite', 'data/dev-database.sqlite', 'dist/database.sqlite', 'dist/data/database.sqlite'];
for (const dbPath of dbs) {
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      db.prepare("ALTER TABLE invoices ADD COLUMN attachments_json TEXT").run();
      console.log(`Added column to ${dbPath}`);
    } catch (e) {
      console.log(`Error on ${dbPath}: ${e.message}`);
    }
  }
}
