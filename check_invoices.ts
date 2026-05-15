import Database from 'better-sqlite3';
const db = new Database('data/database.sqlite');
console.log(db.prepare("PRAGMA table_info(invoices)").all());
