import db from './db.js';
const files = db.prepare('SELECT id, original_name, system_name, folder_path FROM files').all();
console.log(JSON.stringify(files, null, 2));
