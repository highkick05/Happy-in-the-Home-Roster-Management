const fs = require('fs');
const path = 'public/custom-sw.js';
let content = fs.readFileSync(path, 'utf-8');

const clearLogic = `
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});
`;

if (!content.includes('CLEAR_NOTIFICATIONS')) {
  fs.appendFileSync(path, clearLogic);
  console.log('Added CLEAR_NOTIFICATIONS to custom-sw.js');
}
