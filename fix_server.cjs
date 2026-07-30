const fs = require('fs');

const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const oldRead = `  app.post("/api/chat/read", authenticateToken, (req, res) => {
    try {
      db.prepare("UPDATE users SET last_chat_read = datetime('now') WHERE id = ?").run(req.user.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const newRead = `  app.post("/api/chat/read", authenticateToken, (req, res) => {
    try {
      db.prepare("UPDATE users SET last_chat_read = datetime('now') WHERE id = ?").run(req.user.id);
      const io = req.app.get('io');
      if (io) {
        io.emit('chat_read_by_user', { user_id: req.user.id });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

content = content.replace(oldRead, newRead);
fs.writeFileSync(path, content);
console.log('Updated server.ts');
