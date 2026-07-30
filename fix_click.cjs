const fs = require('fs');

function updateClick(filePath, buttonStr, replacement) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(buttonStr, replacement);
  fs.writeFileSync(filePath, content);
}

// LiveChatIcon
updateClick(
  'src/components/LiveChatIcon.tsx',
  `onClick={() => navigate('/chat')}`,
  `onClick={() => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        navigate('/chat');
      }}`
);

// FloatingChatIcon
updateClick(
  'src/components/FloatingChatIcon.tsx',
  `onClick={() => {
              setIsOpen(true);
              setUnreadCount(0);
            }}`,
  `onClick={() => {
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
              }
              setIsOpen(true);
              setUnreadCount(0);
            }}`
);
