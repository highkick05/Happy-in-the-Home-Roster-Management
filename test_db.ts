import Database from 'better-sqlite3';
try {
  const db = new Database('./data/database.sqlite');
  
  console.log("--- All SHIFT_COMPLETED or ALERT ---");
  const notifs = db.prepare("SELECT id, user_id, type, title, message FROM notifications WHERE type IN ('SHIFT_COMPLETED', 'ALERT') ORDER BY created_at DESC LIMIT 10").all();
  console.log(JSON.stringify(notifs, null, 2));
  
  console.log("--- Admin Users ---");
  const admins = db.prepare("SELECT id, role, can_switch_admin FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all();
  console.log(JSON.stringify(admins, null, 2));
  
} catch (e) {
  console.log("Error:", e);
}
