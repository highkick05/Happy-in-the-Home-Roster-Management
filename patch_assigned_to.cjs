const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');

try {
  db.exec("ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER");
  console.log("Added assigned_to_id to tasks");
} catch(e) {
  console.log("Failed to add assigned_to_id:", e.message);
}
console.log("Done fixing DB.");
