import db from './db.js';
db.exec("DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS clients; DROP TABLE IF EXISTS shifts; DROP TABLE IF EXISTS vehicles;");
console.log("Dropped tables.");
