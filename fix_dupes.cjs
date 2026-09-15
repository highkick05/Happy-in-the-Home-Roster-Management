const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `      const stmt = db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(req.file.originalname, req.file.filename, req.file.size, targetUserId, folderPath, dateIssued, dateExpires);`;

const replacement = `      const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(req.file.filename, folderPath) as any;
      let infoId;
      if (existing) {
         db.prepare('UPDATE files SET size = ?, date_issued = ?, date_expires = ?, uploaded_by = ? WHERE id = ?').run(req.file.size, dateIssued, dateExpires, targetUserId, existing.id);
         infoId = existing.id;
      } else {
         const stmt = db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) VALUES (?, ?, ?, ?, ?, ?, ?)');
         const info = stmt.run(req.file.originalname, req.file.filename, req.file.size, targetUserId, folderPath, dateIssued, dateExpires);
         infoId = info.lastInsertRowid;
      }`;

const responseTarget = `res.json({ success: true, id: info.lastInsertRowid, date_issued: dateIssued, date_expires: dateExpires });`;
const responseReplace = `res.json({ success: true, id: infoId, date_issued: dateIssued, date_expires: dateExpires });`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    content = content.replace(responseTarget, responseReplace);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched /api/files endpoint to prevent duplicates.");
} else {
    console.log("Target not found");
}

