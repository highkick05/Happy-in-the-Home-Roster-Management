const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `            if (priceListId) {
              db.prepare("UPDATE price_lists SET file_id = ? WHERE id = ?").run(fileInfo.lastInsertRowid, priceListId);
            }`;

const replacement = `            if (priceListId) {
              db.prepare("UPDATE price_lists SET file_id = ? WHERE id = ?").run(fileInfoId, priceListId);
            }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched fileInfo.lastInsertRowid");
} else {
    console.log("Target not found in server.ts");
}
