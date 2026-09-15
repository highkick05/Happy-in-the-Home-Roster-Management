const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target2 = `            const fileInfo = db.prepare(
              "INSERT INTO files (original_name, system_name, size, uploaded_by, region, folder_path) VALUES (?, ?, ?, ?, ?, ?)",
            ).run(
              req.file.originalname,
              systemName,
              req.file.size,
              req.user.id,
              region || null,
              folderPath,
            );`;

const replacement2 = `            const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(systemName, folderPath) as any;
            let fileInfoId;
            if (existing) {
              db.prepare('UPDATE files SET size = ?, uploaded_by = ?, region = ? WHERE id = ?').run(req.file.size, req.user.id, region || null, existing.id);
              fileInfoId = existing.id;
            } else {
              const fileInfo = db.prepare(
                "INSERT INTO files (original_name, system_name, size, uploaded_by, region, folder_path) VALUES (?, ?, ?, ?, ?, ?)",
              ).run(
                req.file.originalname,
                systemName,
                req.file.size,
                req.user.id,
                region || null,
                folderPath,
              );
              fileInfoId = fileInfo.lastInsertRowid;
            }`;

const replaceId = `            if (priceListId) {
              db.prepare("UPDATE price_lists SET file_id = ? WHERE id = ?").run(fileInfo.lastInsertRowid, priceListId);
            }
            
            res.json({ success: true, id: fileInfo.lastInsertRowid });`;

const newReplaceId = `            if (priceListId) {
              db.prepare("UPDATE price_lists SET file_id = ? WHERE id = ?").run(fileInfoId, priceListId);
            }
            
            res.json({ success: true, id: fileInfoId });`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    content = content.replace(replaceId, newReplaceId);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched client documents upload endpoint.");
} else {
    console.log("Target 2 not found");
}

