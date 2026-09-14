const Database = require('better-sqlite3');
const fs = require('fs');
const dbFile = fs.existsSync('data/dev-database.sqlite') ? 'data/dev-database.sqlite' : 'data/database.sqlite';
const db = new Database(dbFile);
console.log(db.prepare("SELECT id, status, invoice_number, client_id, shift_id, respite_booking_id, services_json FROM invoices LIMIT 5").all());
