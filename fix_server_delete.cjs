const fs = require('fs');

const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const deleteEndpoint = `
  app.delete("/api/chat/messages/:id", authenticateToken, (req, res) => {
    try {
      const messageId = req.params.id;
      const userId = (req).user.id;
      const msg = db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(messageId);
      if (!msg) return res.status(404).json({error: "Not found"});
      if (msg.user_id !== userId && (req).user.role !== 'ADMIN') {
        return res.status(403).json({error: "Forbidden"});
      }
      db.prepare("DELETE FROM chat_messages WHERE id = ?").run(messageId);
      const io = req.app.get('io');
      if (io) {
        io.emit('chat_message_deleted', { id: Number(messageId) });
      }
      res.json({success: true});
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });
`;

if (!content.includes('app.delete("/api/chat/messages/:id"')) {
  // insert after app.post("/api/chat/messages", ...
  const target = '  app.post("/api/chat/messages", authenticateToken, (req, res) => {';
  content = content.replace(target, deleteEndpoint + '\n' + target);
  fs.writeFileSync(path, content);
  console.log('Added delete chat message endpoint');
} else {
  console.log('Delete endpoint already exists');
}
