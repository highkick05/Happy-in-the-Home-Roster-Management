import Database from 'better-sqlite3';
const db = new Database('./data/dev-database.sqlite');
console.log(db.prepare("SELECT name, is_master, effective_date FROM price_lists").all());
