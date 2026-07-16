const Database = require('better-sqlite3');
const db = new Database('./data/dev-database.sqlite');
db.prepare("UPDATE shifts SET home_care_travel_km = NULL, home_care_travel_total = NULL, transport_route_log = NULL WHERE (funding_type = 'HCP' OR funding_type = 'Home Care' OR funding_type = 'HOME_CARE') AND status = 'COMPLETED'").run();
console.log("Wiped home care travel logs");
