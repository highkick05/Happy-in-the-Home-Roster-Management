const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const getChatApi = `
  app.get("/api/chat/messages", authenticateToken, (req, res) => {
    try {
      const messages = db.prepare(\`
        SELECT c.*, u.first_name, u.last_name, u.avatar_url 
        FROM chat_messages c 
        JOIN users u ON c.user_id = u.id 
        ORDER BY c.created_at ASC 
        LIMIT 100
      \`).all();
      res.json(messages);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  app.get("/api/me"`;

code = code.replace(/app\.get\("\/api\/me"/, getChatApi);

// Now patch the socket
const oldSocketHandler = /socket\.on\("send_message", \(msg\) => \{\n\s*try \{\n\s*if \(!msg\.user_id \|\| !msg\.content\) return;\n\s*const stmt = db\.prepare\("INSERT INTO chat_messages \(user_id, content\) VALUES \(\?, \?\)"\);\n\s*const info = stmt\.run\(msg\.user_id, msg\.content\);\n\s*const newMsg = db\.prepare\(\`\n\s*SELECT c\.\*, u\.first_name, u\.last_name, u\.avatar_url \n\s*FROM chat_messages c \n\s*JOIN users u ON c\.user_id = u\.id \n\s*WHERE c\.id = \?\n\s*\`\)\.get\(info\.lastInsertRowid\);\n\s*io\.emit\("new_message", newMsg\);\n\s*\} catch \(e\) \{\n\s*console\.error\(e\);\n\s*\}\n\s*\}\);/;

const newSocketHandler = `socket.on("send_message", (msg, callback) => {
      try {
        if (!msg.user_id || !msg.content) return;
        const stmt = db.prepare("INSERT INTO chat_messages (user_id, content) VALUES (?, ?)");
        const info = stmt.run(msg.user_id, msg.content);
        
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

if (code.match(oldSocketHandler)) {
    code = code.replace(oldSocketHandler, newSocketHandler);
    console.log("Socket handler patched via regex");
} else {
    // manual fallback
    console.log("Regex failed, trying manual");
    code = code.replace('io.emit("new_message", newMsg);', 'socket.broadcast.emit("new_message", newMsg);\n        if (typeof callback === "function") {\n          callback(newMsg);\n        }');
    code = code.replace('socket.on("send_message", (msg) => {', 'socket.on("send_message", (msg, callback) => {');
}

fs.writeFileSync('src/server.ts', code);
console.log('Done');
