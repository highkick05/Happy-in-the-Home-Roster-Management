const http = require('http');
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('data/dev-database.sqlite');
const quote = db.prepare("SELECT id FROM quotes ORDER BY id DESC LIMIT 1").get();

const req = http.request(`http://localhost:3000/api/quotes/${quote.id}/download`, {
    method: 'GET'
}, (res) => {
    if (res.statusCode === 200) {
        console.log("Downloaded successfully");
        const file = fs.createWriteStream("test_download.pdf");
        res.pipe(file);
    } else {
        console.log("Failed", res.statusCode);
    }
});
req.end();
