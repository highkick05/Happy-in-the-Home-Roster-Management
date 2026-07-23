import Database from 'better-sqlite3';
const db = new Database(':memory:');
db.exec("CREATE TABLE shifts (status TEXT, notes TEXT)");
db.exec("INSERT INTO shifts VALUES ('COMPLETED', NULL)");
const res = db.prepare("SELECT * FROM shifts WHERE (UPPER(status) IN ('COMPLETED', 'CANCELLED', 'HISTORICAL') OR notes LIKE '%[HISTORICAL]%') AND (notes != 'Manually generated invoice' OR notes IS NULL)").all();
console.log(res.length);
