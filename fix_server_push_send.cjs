const fs = require('fs');

const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `      const io = req.app.get('io');
      if (io) {`;

const replacement = `      const io = req.app.get('io');
      
      // --- Send Web Push Notifications to all other users ---
      try {
        const subscriptions = db.prepare("SELECT * FROM push_subscriptions WHERE user_id != ?").all(user_id);
        const payload = JSON.stringify({
          title: "New message from " + (newMsg.first_name || 'Someone'),
          body: newMsg.content || (newMsg.file_name ? 'Sent a file: ' + newMsg.file_name : 'Sent an attachment'),
          url: '/chat',
          badgeCount: 1 // App will increment or fetch
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
      
      if (io) {`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
console.log('Added push sending logic');
