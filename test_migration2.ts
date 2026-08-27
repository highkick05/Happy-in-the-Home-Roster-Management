import db from "./db.js";
const adminIds = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all().map((r: any) => r.id);
if (adminIds.length > 0) {
    const placeholders = adminIds.map(() => '?').join(',');
    const count = db.prepare(`SELECT count(*) as c FROM notifications WHERE user_id IN (${placeholders})`).all(...adminIds);
    console.log("Admin specific notifications:", count);
}
