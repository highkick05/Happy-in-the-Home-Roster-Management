const Database = require('better-sqlite3');
const fs = require('fs');
if (fs.existsSync('data/database.sqlite')) {
  const db = new Database('data/database.sqlite');
  try {
    const info = db.prepare("PRAGMA table_info(chat_messages)").all();
    console.log("Prod table info:", info);
  } catch (e) {
    console.log("Error:", e.message);
  }
} else {
  console.log("No prod DB found locally");
}
