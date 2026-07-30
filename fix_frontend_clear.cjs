const fs = require('fs');

function fixIcon(path) {
  let content = fs.readFileSync(path, 'utf-8');
  const target = `setUnreadCount(0);`;
  const replacement = `setUnreadCount(0);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
      }`;
  
  if (!content.includes('CLEAR_NOTIFICATIONS')) {
    // replace only the handleChatRead instance
    const handleChatRead = `const handleChatRead = () => {
      setUnreadCount(0);`;
    const newHandleChatRead = `const handleChatRead = () => {
      setUnreadCount(0);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
      }`;
      
    content = content.replace(handleChatRead, newHandleChatRead);
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
  }
}

fixIcon('src/components/LiveChatIcon.tsx');
fixIcon('src/components/FloatingChatIcon.tsx');
