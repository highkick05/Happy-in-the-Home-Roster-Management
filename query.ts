import db from './db.js';
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='clients'").get());
