import Database from 'better-sqlite3';

const db = new Database('data/dev-database.sqlite');
const row = db.prepare("SELECT value FROM settings WHERE key = 'websiteLogo'").get();
console.log(row);
