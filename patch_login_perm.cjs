const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const effect = `
  React.useEffect(() => {
    const promptForNotifications = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      document.removeEventListener('click', promptForNotifications);
    };
    
    document.addEventListener('click', promptForNotifications);
    return () => document.removeEventListener('click', promptForNotifications);
  }, []);
`;

if (!content.includes('promptForNotifications')) {
  content = content.replace("function App() {", "function App() {\n" + effect);
  fs.writeFileSync('src/App.tsx', content);
}
