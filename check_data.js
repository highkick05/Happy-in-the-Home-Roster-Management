import db from './db.js';
console.log("Users:", db.prepare("SELECT COUNT(*) as c FROM users").get().c);
console.log("Clients:", db.prepare("SELECT COUNT(*) as c FROM clients").get().c);
console.log("Shifts:", db.prepare("SELECT COUNT(*) as c FROM shifts").get().c);
