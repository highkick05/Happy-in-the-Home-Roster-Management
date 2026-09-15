const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const migrations = `
  try {
    const usersCols = db.prepare("PRAGMA table_info(users)").all();
    if (!usersCols.some(c => c.name === 'status')) {
      db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
      console.log("Migrated users table to include status");
    }
    if (!usersCols.some(c => c.name === 'additional_positions')) {
      db.exec("ALTER TABLE users ADD COLUMN additional_positions TEXT DEFAULT '[]'");
      console.log("Migrated users table to include additional_positions");
    }
  } catch (e) {
    console.error("Migration error for users table additional columns:", e.message);
  }
`;

if (!content.includes("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'")) {
    content = content.replace(
        'console.error("Migration error for users table:", e.message);\n  }',
        'console.error("Migration error for users table:", e.message);\n  }\n' + migrations
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log("Migrations correctly added.");
} else {
    console.log("Migrations already exist.");
}
