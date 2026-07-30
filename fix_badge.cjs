const fs = require('fs');

function addBadgeLogic(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('setAppBadge')) {
    const badgeEffect = `
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        // @ts-ignore
        navigator.setAppBadge(unreadCount).catch(() => {});
      } else {
        // @ts-ignore
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);
`;
    // insert before the return statement
    const returnIndex = content.lastIndexOf('return (');
    if (returnIndex !== -1) {
      content = content.slice(0, returnIndex) + badgeEffect + content.slice(returnIndex);
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + filePath);
    }
  }
}

addBadgeLogic('src/components/LiveChatIcon.tsx');
addBadgeLogic('src/components/FloatingChatIcon.tsx');
