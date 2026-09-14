const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `              certificatePath = filename;
              
              // Also add to global files table
              const folderPath = \`/Staff/\${nameDir}/Training\`;
              const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(filename, folderPath);
              if (!existing) {
                  db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                      filename, filename, req.file.size, folderPath, req.user.id
                  );
              }`;

const replaceWith = `              // Also add to global files table
              const folderPath = \`/Staff/\${nameDir}/Training\`;
              const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(filename, folderPath);
              let fileRecordId;
              if (!existing) {
                  const res = db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                      filename, filename, req.file.size, folderPath, req.user.id
                  );
                  fileRecordId = res.lastInsertRowid;
              } else {
                  fileRecordId = existing.id;
              }
              certificatePath = \`/api/files/download/\${fileRecordId}\`;
`;

if(content.includes(target)) {
    content = content.replace(target, replaceWith);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched successfully!");
} else {
    console.log("Could not find target block!");
}
