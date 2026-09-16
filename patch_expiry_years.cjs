const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
try {
  db.prepare("ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1").run();
  console.log("Added expiry_years to onboarding_hub_steps");
} catch (e) {
  console.log(e.message);
}
