const fs = require('fs');

const path = 'src/components/FloatingChatIcon.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Find the early return
const earlyReturn = "if (location.pathname.includes('/chat')) return null;";
const hookCode = `  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        // @ts-ignore
        navigator.setAppBadge(unreadCount).catch(() => {});
      } else {
        // @ts-ignore
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);`;

// We'll just replace the original code with a clean version
// First remove the hook from where it is now (after the early return)
content = content.replace(/  useEffect\(\(\) => \{\n    if \('setAppBadge'.*?  \}, \[unreadCount\]\);/s, '');

// Now replace the early return with the hook + early return
content = content.replace(earlyReturn, hookCode + "\n\n  " + earlyReturn);

fs.writeFileSync(path, content);
console.log('Fixed hook order');
