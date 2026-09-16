const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
try {
  const stmt = db.prepare("SELECT * FROM positions");
  console.log("Positions:", stmt.all());
} catch (e) {
  console.error("Error:", e.message);
}
