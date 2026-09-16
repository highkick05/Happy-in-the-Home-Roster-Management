const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
try {
  db.prepare("ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1").run();
  console.log("Added expiry_years to dev DB");
} catch (e) {
  console.log(e.message);
}
try {
  const dbProd = new Database('data/database.sqlite');
  dbProd.prepare("ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1").run();
  console.log("Added expiry_years to prod DB");
} catch(e) {
  console.log(e.message);
}
