const Database = require('better-sqlite3');
const db = new Database('./data/dev-database.sqlite');
const shifts = db.prepare("SELECT start_time, transport_route_log, funding_type, status FROM shifts").all();
console.log(shifts.slice(0, 5));
