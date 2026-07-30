const fs = require('fs');
const path = 'src/components/Auth/Login.tsx';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('Notification.requestPermission')) {
  content = content.replace(
    /login\(data\.token, data\.user, data\.settings\);/,
    `login(data.token, data.user, data.settings);
      
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }`
  );
  fs.writeFileSync(path, content);
  console.log('Updated Login.tsx');
}
