const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');

try {
  db.exec("ALTER TABLE task_categories ADD COLUMN sort_order INTEGER DEFAULT 0");
  console.log("Added sort_order to task_categories");
} catch(e) {
  console.log("Failed to add sort_order:", e.message);
}
console.log("Done fixing DB.");
