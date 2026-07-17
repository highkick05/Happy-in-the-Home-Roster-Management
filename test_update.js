const db = require('better-sqlite3')('data/dev-database.sqlite');
db.prepare("UPDATE users SET can_switch_admin = 1 WHERE email = 'admin@happyinthehome.com'").run();
console.log(db.prepare("SELECT can_switch_admin FROM users").all());
