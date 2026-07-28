import Database from 'better-sqlite3';
const db = new Database('data/dev-database.sqlite');
console.log(db.prepare("SELECT count(*) FROM shifts").get());
