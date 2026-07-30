const fs = require('fs');

const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

// Add push_subscriptions table
const tableCode = `
    db.exec(\`
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
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS push_subscriptions')) {
  content = content.replace('CREATE TABLE IF NOT EXISTS client_template_settings (', tableCode + '\n      CREATE TABLE IF NOT EXISTS client_template_settings (');
}

// Add push notification routes and web-push import
const importCode = `import webpush from 'web-push';\n\nconst VAPID_PUBLIC_KEY = 'BJJipdW8yPjurHatAx-yKuxglYM9TVFau8jQUsbPK5ybbYUotCGx6Y3zd6sOCQkeWBsfrHYHgwZYKzwp8BBv2_0';\nconst VAPID_PRIVATE_KEY = 'XFEVMuT0GKOCFwEoxi7PZt6MGALJih-1LUR7OWy_Nwk';\nwebpush.setVapidDetails('mailto:admin@happyinthehome.org', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);\n`;

if (!content.includes('import webpush')) {
  content = content.replace('import express', importCode + 'import express');
}

const pushRoutesCode = `
  app.get("/api/push/public-key", (req, res) => {
    res.send(VAPID_PUBLIC_KEY);
  });

  app.post("/api/push/subscribe", authenticateToken, (req, res) => {
    try {
      const { subscription } = req.body;
      const { endpoint, keys } = subscription;
      
      const existing = db.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").get(endpoint, req.user.id);
      
      if (!existing) {
        db.prepare(\`
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
          VALUES (?, ?, ?, ?)
        \`).run(req.user.id, endpoint, keys.p256dh, keys.auth);
      }
      
      res.status(201).json({ success: true });
    } catch (e: any) {
      console.error("Push subscribe error:", e);
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!content.includes('/api/push/public-key')) {
  content = content.replace('app.post("/api/chat/typing"', pushRoutesCode + '\n  app.post("/api/chat/typing"');
}

// Update the chat message sending logic to send push notifications
// We need to hook into app.post('/api/chat')

fs.writeFileSync(path, content);
console.log('Added push DB and routes');
