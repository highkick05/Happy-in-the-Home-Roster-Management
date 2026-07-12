import db from "./db.js";
try {
  console.log(db.prepare("SELECT * FROM services").all());
} catch(e) { console.error(e.message); }
