const db = require('better-sqlite3')('local.db');
const logs = db.prepare("SELECT transport_route_log FROM shifts WHERE transport_route_log IS NOT NULL AND transport_route_log != 'No route logged' LIMIT 5").all();
console.log(JSON.stringify(logs, null, 2));
