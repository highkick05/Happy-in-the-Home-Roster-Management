const fs = require('fs');
const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `    db.exec(\`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    \`);
      CREATE TABLE IF NOT EXISTS client_template_settings (`;

const fixed = `      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS client_template_settings (`;

// If target doesn't match exactly because of spaces, we'll use regex
content = content.replace(/    db\.exec\(\`\n      CREATE TABLE IF NOT EXISTS push_subscriptions \([\s\S]*?\);\n    \`\);\n      CREATE TABLE IF NOT EXISTS client_template_settings \(/, fixed);

fs.writeFileSync(path, content);
console.log('Fixed syntax error via regex');
