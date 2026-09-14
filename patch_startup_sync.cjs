const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const syncCode = `
  // Sync historical Staff Training files into the database
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'Staff');
    if (fs.existsSync(uploadsDir)) {
      const staffDirs = fs.readdirSync(uploadsDir);
      for (const staffDir of staffDirs) {
        const staffPath = path.join(uploadsDir, staffDir);
        if (fs.statSync(staffPath).isDirectory()) {
          const trainingPath = path.join(staffPath, 'Training');
          if (fs.existsSync(trainingPath) && fs.statSync(trainingPath).isDirectory()) {
            const files = fs.readdirSync(trainingPath);
            for (const file of files) {
              const filePath = path.join(trainingPath, file);
              if (fs.statSync(filePath).isFile()) {
                const folderPath = \`/Staff/\${staffDir}/Training\`;
                const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(file, folderPath);
                if (!existing) {
                  const stat = fs.statSync(filePath);
                  db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                    file, file, stat.size, folderPath, 1
                  );
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    logger.error('Failed to sync historical staff training files', e);
  }

  // Setup Quote PDF route
`;

const insertionPoint = '// Setup Quote PDF route';

if (content.includes(insertionPoint)) {
    content = content.replace(insertionPoint, syncCode);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched server startup script for DB sync!");
} else {
    console.log("Could not find insertion point!");
}

