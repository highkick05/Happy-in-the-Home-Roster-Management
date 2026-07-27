const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `    socket.on("send_message", (msg, callback) => {
      try {
        if (!msg.user_id || (!msg.content && !msg.file_url)) return;
        const stmt = db.prepare("INSERT INTO chat_messages (user_id, content, file_url, file_name, file_type) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(msg.user_id, msg.content || '', msg.file_url || null, msg.file_name || null, msg.file_type || null);
        
        const newMsg = db.prepare(\`
          SELECT c.*, u.first_name, u.last_name, u.avatar_url 
          FROM chat_messages c 
          JOIN users u ON c.user_id = u.id 
          WHERE c.id = ?
        \`).get(info.lastInsertRowid);
        
        socket.broadcast.emit("new_message", newMsg);
        if (typeof callback === "function") {
          callback(newMsg);
        }
      } catch (e) {
        console.error(e);
      }
    });`;

const replacement = `    socket.on("send_message", (msg, callback) => {
      console.log("Received send_message event:", msg);
      try {
        if (!msg.user_id || (!msg.content && !msg.file_url)) {
          console.log("Validation failed, ignoring message.");
          return;
        }
        const stmt = db.prepare("INSERT INTO chat_messages (user_id, content, file_url, file_name, file_type) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(msg.user_id, msg.content || '', msg.file_url || null, msg.file_name || null, msg.file_type || null);
        
        console.log("Inserted message with ID:", info.lastInsertRowid);
        const newMsg = db.prepare(\`
          SELECT c.*, u.first_name, u.last_name, u.avatar_url 
          FROM chat_messages c 
          JOIN users u ON c.user_id = u.id 
          WHERE c.id = ?
        \`).get(info.lastInsertRowid);
        
        socket.broadcast.emit("new_message", newMsg);
        if (typeof callback === "function") {
          callback(newMsg);
        }
      } catch (e) {
        console.error("Error in send_message:", e);
      }
    });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Patched server.ts");
} else {
  console.log("Could not find target block");
}
