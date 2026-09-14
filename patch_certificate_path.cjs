const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
  'certificatePath = filename;',
  `
  certificatePath = filename;
  `
); // Let's just find exactly what to replace.

const searchStr = `              // Also add to global files table
              const folderPath = \\\`/Staff/\\\${nameDir}/Training\\\`;
              const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(filename, folderPath);
              if (!existing) {
                  const result = db.prepare(\\\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\\\`).run(
                      filename, filename, req.file.size, folderPath, req.user.id
                  );
                  certificatePath = \\\`/api/files/download/\\\${result.lastInsertRowid}\\\`;
              } else {
                  certificatePath = \\\`/api/files/download/\\\${existing.id}\\\`;
              }`;

console.log("I'll do a simple replace logic.");
