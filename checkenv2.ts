import fs from 'fs';
console.log("Files in uploads:", fs.existsSync("uploads") ? fs.readdirSync("uploads") : "No uploads dir");
console.log("Files in uploads/assets:", fs.existsSync("uploads/assets") ? fs.readdirSync("uploads/assets") : "No assets dir");
