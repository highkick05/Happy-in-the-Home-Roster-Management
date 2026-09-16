const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
try {
  const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const info = stmt.run(1, 'Test', '', '', 0, 1, 1, 1);
  console.log("Success", info);
} catch (e) {
  console.error("Error:", e.message);
}
