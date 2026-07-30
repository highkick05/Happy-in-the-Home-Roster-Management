const fs = require('fs');

function fixIcon(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Add visibility listener
  if (!content.includes('visibilitychange')) {
    const socketCode = `
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    const socket = io`;
    content = content.replace("const socket = io", socketCode);
    
    // Add cleanup
    const cleanupStr = `window.removeEventListener('chat_read', handleChatRead);`;
    const newCleanupStr = `window.removeEventListener('chat_read', handleChatRead);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);`;
    content = content.replace(cleanupStr, newCleanupStr);
  }
  
  // Add socket listener for chat_read_by_user
  if (!content.includes('chat_read_by_user')) {
    const socketEventStr = `socket.on('chat_cleared', () => {`;
    const newSocketEventStr = `socket.on('chat_read_by_user', (data: any) => {
      if (user && data.user_id === user.id) {
        setUnreadCount(0);
      }
    });
    
    socket.on('chat_cleared', () => {`;
    content = content.replace(socketEventStr, newSocketEventStr);
  }
  
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + filePath);
}

fixIcon('src/components/LiveChatIcon.tsx');
fixIcon('src/components/FloatingChatIcon.tsx');
