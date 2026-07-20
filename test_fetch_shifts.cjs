const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const shifts = db.prepare(`SELECT * FROM shifts ORDER BY id DESC LIMIT 5`).all();
console.log(shifts);
