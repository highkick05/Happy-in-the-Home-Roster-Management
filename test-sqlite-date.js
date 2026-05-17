const Database = require('better-sqlite3');
const db = new Database(':memory:');
const q = db.prepare("SELECT datetime('2026-05-17T09:00:00.000Z', '-14 hours') as a");
console.log(q.get());
