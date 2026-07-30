const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf-8');

const targetLoop = `        subscriptions.forEach(sub => {
          const pushSubscription = {`;

const newLoop = `        subscriptions.forEach(sub => {
          let badgeCount = 1;
          try {
            const userRow = db.prepare("SELECT last_chat_read FROM users WHERE id = ?").get(sub.user_id);
            if (!userRow?.last_chat_read) {
              badgeCount = db.prepare("SELECT COUNT(*) as count FROM chat_messages WHERE content != 'SYSTEM_CHAT_CLEARED' AND user_id != ?").get(sub.user_id).count;
            } else {
              badgeCount = db.prepare("SELECT COUNT(*) as count FROM chat_messages WHERE created_at > ? AND content != 'SYSTEM_CHAT_CLEARED' AND user_id != ?").get(userRow.last_chat_read, sub.user_id).count;
            }
          } catch(e) { console.error(e); }
          
          const userPayload = JSON.stringify({
            title: "New message from " + (newMsg.first_name || 'Someone'),
            body: newMsg.content || (newMsg.file_name ? 'Sent a file: ' + newMsg.file_name : 'Sent an attachment'),
            url: '/chat',
            badgeCount: badgeCount
          });
          
          const pushSubscription = {`;

serverContent = serverContent.replace(targetLoop, newLoop);
serverContent = serverContent.replace('webpush.sendNotification(pushSubscription, payload)', 'webpush.sendNotification(pushSubscription, userPayload)');

fs.writeFileSync('src/server.ts', serverContent);
