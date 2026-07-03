import db from './db.js';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const files = db.prepare('SELECT id, system_name, folder_path FROM files').all();

console.log(`Checking ${files.length} files...`);
let migrated = 0;

for (const file of files) {
    if (!(file as any).folder_path || (file as any).folder_path === '/' || (file as any).folder_path.trim() === '') {
        continue; // Already at root, no migration needed
    }

    let subfolder = (file as any).folder_path.trim();
    subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, '');
    if (subfolder.startsWith('/')) {
        subfolder = subfolder.substring(1);
    }
    
    // Check if the current system_name already starts with the subfolder
    // E.g., if system_name is "Staff/John/docs.pdf", we don't want to move it to "Staff/John/Staff/John/docs.pdf"
    if ((file as any).system_name.startsWith(subfolder + '/') || (file as any).system_name.startsWith(subfolder + '\\')) {
        continue; 
    }

    const currentFilePath = path.join(UPLOADS_DIR, (file as any).system_name);
    const targetDir = path.join(UPLOADS_DIR, subfolder);
    const targetFilePath = path.join(targetDir, (file as any).system_name);
    
    if (fs.existsSync(currentFilePath)) {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.renameSync(currentFilePath, targetFilePath);
        
        const newSystemName = path.posix.join(subfolder, (file as any).system_name);
        db.prepare('UPDATE files SET system_name = ? WHERE id = ?').run(newSystemName, (file as any).id);
        console.log(`Moved ${(file as any).system_name} to ${newSystemName}`);
        migrated++;
    } else {
        // console.log(`File not found: ${currentFilePath}`);
    }
}

console.log(`Successfully migrated ${migrated} files.`);
