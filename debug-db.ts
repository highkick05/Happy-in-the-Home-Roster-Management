import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Try both possible locations
const paths = [
  './data/database.sqlite',
  './data/dev-database.sqlite',
  './database.sqlite',
  './dev-database.sqlite'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`Checking DB at ${p}...`);
    const db = new Database(p);
    try {
      const services = db.prepare('SELECT id, name FROM services').all();
      if (services.length > 0) {
        console.log(`Found ${services.length} services in ${p}:`, JSON.stringify(services, null, 2));
      }
    } catch (e) {}
    db.close();
  }
}
process.exit(0);
