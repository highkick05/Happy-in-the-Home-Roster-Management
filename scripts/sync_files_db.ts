import db from '../db.ts';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const clients = db.prepare('SELECT id, first_name, last_name FROM clients').all();

for (const client of clients) {
  const clientFolder = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const docsDir = path.join(UPLOADS_DIR, clientFolder, 'Documents');
  
  if (!fs.existsSync(docsDir)) continue;

  const getDocsInDir = (dirPath, category) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath).filter((f) => !fs.statSync(path.join(dirPath, f)).isDirectory());
    for (const file of files) {
      const stats = fs.statSync(path.join(dirPath, file));
      const dbCategoryPath = category === 'Main' ? '' : `/${category}`;
      const folderPath = `/Clients/${clientFolder}/Documents${dbCategoryPath}`;
      const systemNamePath = `${clientFolder}/Documents${dbCategoryPath}/${file}`;
      
      const existing = db.prepare('SELECT id FROM files WHERE folder_path = ? AND original_name = ?').get(folderPath, file);
      if (!existing) {
        db.prepare(
          'INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)'
        ).run(file, systemNamePath, stats.size, 1, folderPath);
        console.log(`Inserted ${file} into files table`);
      }
    }
  };

  getDocsInDir(docsDir, 'Main');
  getDocsInDir(path.join(docsDir, 'Saved'), 'Saved');
  getDocsInDir(path.join(docsDir, 'Completed'), 'Completed');
  getDocsInDir(path.join(docsDir, 'Templates'), 'Templates');
}

console.log('Done syncing files table');