import db from "./db.js";
const cols = db.prepare('PRAGMA table_info(chat_messages)').all();
console.log(cols.map(c => c.name));
