const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf-8');

const oldStr = `      try {
        db.exec("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0;");
      } catch (e) {
        // column likely exists
      }`;

content = content.replace(oldStr, "");

const oldStr2 = `    console.log("[DEBUG] Completed client_ledger_entries table setup.");`;

const newStr2 = `    console.log("[DEBUG] Completed client_ledger_entries table setup.");

    try {
      db.exec("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0;");
    } catch (e) {
      // column likely exists
    }`;

content = content.replace(oldStr2, newStr2);

fs.writeFileSync('src/server.ts', content);
