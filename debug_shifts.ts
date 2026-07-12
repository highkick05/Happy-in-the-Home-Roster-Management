import db from './db.js';
console.log(db.prepare('SELECT id, services_json FROM shifts ORDER BY id DESC LIMIT 5').all());
