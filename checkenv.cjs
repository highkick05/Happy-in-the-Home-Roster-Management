import fs from 'fs';
console.log("CWD:", process.cwd());
console.log("Files in CWD:", fs.readdirSync(process.cwd()));
console.log("Files in data:", fs.existsSync("data") ? fs.readdirSync("data") : "No data dir");
