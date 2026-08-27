import Database from 'better-sqlite3';
const db = new Database('./data/dev-database.sqlite');
const notifs = db.prepare("SELECT * FROM notifications WHERE user_id = 0 ORDER BY created_at DESC LIMIT 5").all();
console.log("Shared:", notifs.length);

const staffAdmin = db.prepare("SELECT id FROM users WHERE role != 'ADMIN' AND can_switch_admin = 1 LIMIT 1").get();
if (staffAdmin) {
    const query = "SELECT * FROM notifications WHERE user_id = ? OR user_id = 0";
    const fetched = db.prepare(query).all(staffAdmin.id);
    console.log("Staff Admin fetch:", fetched.length);
}
