const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// 1. add table
const createTableRegex = /CREATE TABLE IF NOT EXISTS training_modules \(/;
const tableSQL = `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );\n      CREATE TABLE IF NOT EXISTS training_modules (`;

if (createTableRegex.test(code)) {
    code = code.replace(createTableRegex, tableSQL);
}

// 2. Import HTTP and Socket.IO
code = code.replace('import express from "express";', 'import express from "express";\nimport { Server as SocketIOServer } from "socket.io";\nimport http from "http";');

// 3. Replace app.listen
const listenRegex = /app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\s*console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\s*\}\);/;
const listenReplacement = `const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    try {
      const messages = db.prepare(\`
        SELECT c.*, u.first_name, u.last_name, u.avatar_url 
        FROM chat_messages c 
        JOIN users u ON c.user_id = u.id 
        ORDER BY c.created_at ASC 
        LIMIT 100
      \`).all();
      socket.emit("initial_messages", messages);
    } catch (e) {
      console.error(e);
    }

    socket.on("send_message", (msg) => {
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
        
        io.emit("new_message", newMsg);
      } catch (e) {
        console.error(e);
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\$\{PORT\}\`);
  });`;

if (listenRegex.test(code)) {
    code = code.replace(listenRegex, listenReplacement);
} else {
    console.log("Could not find app.listen!");
}

fs.writeFileSync('src/server.ts', code);
console.log('Server patched for socket.io');
