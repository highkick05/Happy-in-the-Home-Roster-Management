const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const tableCreationStr = `
    db.exec(\`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active',
        start_date TEXT,
        end_date TEXT,
        assigned_staff TEXT,
        assigned_clients TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    \`);

    db.exec(\`
      CREATE TABLE IF NOT EXISTS sub_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    \`);
`;

code = code.replace('CREATE TABLE IF NOT EXISTS ndis_service_agreements', tableCreationStr + '\n      CREATE TABLE IF NOT EXISTS ndis_service_agreements');

fs.writeFileSync(file, code);
