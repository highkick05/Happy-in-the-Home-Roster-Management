const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const createPositions = `
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
`;

const seedPositions = `
  try {
    const positionsCount = db.prepare("SELECT COUNT(*) as count FROM positions").get().count;
    if (positionsCount === 0) {
      const defaultPositions = [
        'Support Worker',
        'Enrolled Nurse',
        'Registered Nurse',
        'Administration',
        'Manager'
      ];
      const insertPos = db.prepare("INSERT OR IGNORE INTO positions (name) VALUES (?)");
      defaultPositions.forEach(p => insertPos.run(p));
      console.log("Seeded default positions");
    }
  } catch(e) {
    console.error("Error seeding positions:", e.message);
  }
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS positions')) {
    content = content.replace(
        'CREATE TABLE IF NOT EXISTS position_templates (',
        createPositions + '\n      CREATE TABLE IF NOT EXISTS position_templates ('
    );
}

if (!content.includes('Seeded default positions')) {
    content = content.replace(
        '// Auto-assign avatars if missing',
        seedPositions + '\n  // Auto-assign avatars if missing'
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log("Positions table creation added");
