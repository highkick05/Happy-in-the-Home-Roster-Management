const fs = require('fs');

const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

// Add Push logic properly

// Add web-push import
const importCode = `import webpush from 'web-push';\n\nconst VAPID_PUBLIC_KEY = 'BJJipdW8yPjurHatAx-yKuxglYM9TVFau8jQUsbPK5ybbYUotCGx6Y3zd6sOCQkeWBsfrHYHgwZYKzwp8BBv2_0';\nconst VAPID_PRIVATE_KEY = 'XFEVMuT0GKOCFwEoxi7PZt6MGALJih-1LUR7OWy_Nwk';\nwebpush.setVapidDetails('mailto:admin@happyinthehome.org', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);\n`;

if (!content.includes('import webpush')) {
  content = content.replace('import express', importCode + 'import express');
}

// Add push DB table
const tableCode = `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS push_subscriptions')) {
  content = content.replace('      CREATE TABLE IF NOT EXISTS client_template_settings (', tableCode + '      CREATE TABLE IF NOT EXISTS client_template_settings (');
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
  content = content.replace('  app.post("/api/chat/typing"', pushRoutesCode + '\n  app.post("/api/chat/typing"');
}

// Add Push send logic
const target = `      const io = req.app.get('io');
      if (io) {
        locallyEmittedMessageIds.add(newMsg.id);`;

const replacement = `      const io = req.app.get('io');
      
      // --- Send Web Push Notifications to all other users ---
      try {
        const subscriptions = db.prepare("SELECT * FROM push_subscriptions WHERE user_id != ?").all(user_id);
        const payload = JSON.stringify({
          title: "New message from " + (newMsg.first_name || 'Someone'),
          body: newMsg.content || (newMsg.file_name ? 'Sent a file: ' + newMsg.file_name : 'Sent an attachment'),
          url: '/chat',
          badgeCount: 1
        });
        
        subscriptions.forEach(sub => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          
          webpush.sendNotification(pushSubscription, payload).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
            } else {
              console.error('Error sending push notification:', err);
            }
          });
        });
      } catch(pushErr) {
        console.error("Failed to send push notifications", pushErr);
      }
      
      if (io) {
        locallyEmittedMessageIds.add(newMsg.id);`;

if (!content.includes('webpush.sendNotification')) {
  content = content.replace(target, replacement);
}

fs.writeFileSync(path, content);
console.log('Fixed server all');
