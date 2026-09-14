const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
try {
  let sql = "SELECT * FROM files ORDER BY sort_order ASC, original_name ASC";
  const rows = db.prepare(sql).all();
  console.log("Success. Rows:", rows.length);
} catch (e) {
  console.error("Query failed:", e.message);
}
