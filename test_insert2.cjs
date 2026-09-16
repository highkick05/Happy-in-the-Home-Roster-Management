const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
  const stmt = db.prepare("SELECT * FROM positions");
  console.log("Positions:", stmt.all().length);
} catch (e) {
  console.error("Error:", e.message);
}
