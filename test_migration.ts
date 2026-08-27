import db from "./db.js";
const c = db.prepare("SELECT count(*) as c FROM notifications WHERE user_id = 0").get();
console.log("Shared Admin Notifications:", c);
