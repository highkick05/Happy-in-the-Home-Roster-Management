import fs from 'fs';
import path from 'path';
import db from '../db.ts';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CLIENTS_DIR = path.join(UPLOADS_DIR, 'Clients');

if (!fs.existsSync(CLIENTS_DIR)) {
  fs.mkdirSync(CLIENTS_DIR, { recursive: true });
}

const clients = db.prepare('SELECT id, first_name, last_name FROM clients').all();
for (const client of clients) {
  const clientFolder = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const oldPath = path.join(UPLOADS_DIR, clientFolder);
  const newPath = path.join(CLIENTS_DIR, clientFolder);
  
  if (fs.existsSync(oldPath)) {
     if (!fs.existsSync(newPath)) {
        console.log(`Moving ${oldPath} to ${newPath}`);
        fs.renameSync(oldPath, newPath);
     } else {
        console.log(`Both paths exist, skipping move for ${clientFolder}, manual merge needed`);
     }
  }
}

// Update existing files in DB to point to correct path
db.prepare(`UPDATE files SET system_name = 'Clients/' || system_name WHERE system_name NOT LIKE 'Clients/%' AND folder_path LIKE '/Clients/%'`).run();

console.log('Migration complete');
