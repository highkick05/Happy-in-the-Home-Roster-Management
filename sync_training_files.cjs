const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('data.db');

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
                        const folderPath = `/Staff/${staffDir}/Training`;
                        const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(file, folderPath);
                        if (!existing) {
                            console.log(`Adding ${file} to files table for ${staffDir}`);
                            const stat = fs.statSync(filePath);
                            db.prepare(`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)`).run(
                                file, file, stat.size, folderPath, 1
                            );
                        }
                    }
                }
            }
        }
    }
}
console.log("Sync complete!");
