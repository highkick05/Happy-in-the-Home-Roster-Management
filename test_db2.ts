import db from "./db.js";
console.log(db.prepare("SELECT name, type FROM sqlite_master").all());
