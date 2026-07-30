const fs = require('fs');
const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = "CREATE TABLE IF NOT EXISTS chat_messages (";
const colCheck = `
      try {
        db.exec("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0;");
      } catch (e) {
        // column likely exists
      }
`;

if (!content.includes('ADD COLUMN is_edited')) {
  // Let's find where chat_messages is created and insert our patch after it
  const endOfCreateTable = content.indexOf(";", content.indexOf("CREATE TABLE IF NOT EXISTS chat_messages")) + 1;
  content = content.substring(0, endOfCreateTable) + colCheck + content.substring(endOfCreateTable);
  fs.writeFileSync(path, content);
}
