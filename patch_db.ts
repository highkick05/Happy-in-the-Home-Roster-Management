import db from "./db.js";
try {
  db.exec("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0");
  console.log("Added is_edited column");
} catch(e) {
  console.error("Column might exist:", e.message);
}
