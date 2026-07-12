import db from './db.js';
const info = db.prepare("PRAGMA table_info(shifts)").all();
console.log(info.map((i: any) => i.name).join(', '));
