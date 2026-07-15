const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
try {
  db.prepare("ALTER TABLE tasks ADD COLUMN attachments TEXT DEFAULT '[]'").run();
  console.log("Added attachments column");
} catch (e) {
  console.log(e.message);
}
