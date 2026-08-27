import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "database.sqlite"));

console.log("Migrating notifications to use shared user_id = 0 for admins...");

// Types that are typically admin-only or have admin copies:
// SHIFT_COMPLETED is always for admins.
// DOCUMENT_EXPIRED, DOCUMENT_EXPIRING_SOON, TRAINING_EXPIRED, TRAINING_EXPIRING_SOON
// wait, these can be for STAFF members too!
// The ones for admins have `title` like 'Staff Document Expired' or `message` starting with 'Staff member'.
// Or, simpler: we just find duplicate notifications sent to admins, keep one, set user_id = 0, delete the rest.

// Let's get all notifications that went to Admins (where user_id has role = 'ADMIN' or can_switch_admin = 1)
const adminIds = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all().map((r: any) => r.id);

console.log("Admin IDs:", adminIds);

// Get all notifications for these admins
const adminNotifs = db.prepare(`SELECT * FROM notifications WHERE user_id IN (${adminIds.join(',')})`).all();

console.log(`Found ${adminNotifs.length} notifications for admins.`);

const grouped = new Map();
for (const n of adminNotifs) {
  // Use type, title, and message as a unique key
  const key = `${n.type}:::${n.title}:::${n.message}:::${n.link}`;
  if (!grouped.has(key)) {
    grouped.set(key, []);
  }
  grouped.get(key).push(n);
}

db.prepare("BEGIN TRANSACTION").run();

let deletedCount = 0;
let updatedCount = 0;

for (const [key, group] of grouped) {
  // Keep the first one, set user_id = 0
  const keep = group[0];
  db.prepare("UPDATE notifications SET user_id = 0 WHERE id = ?").run(keep.id);
  updatedCount++;
  
  // Delete the rest
  for (let i = 1; i < group.length; i++) {
    db.prepare("DELETE FROM notifications WHERE id = ?").run(group[i].id);
    deletedCount++;
  }
}

db.prepare("COMMIT").run();
console.log(`Migration complete. Updated ${updatedCount} to shared admin (user_id=0). Deleted ${deletedCount} duplicates.`);
