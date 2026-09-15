const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf8');

const target = `  onRegistered(r) {
    if (r) {
      // Check every minute
      setInterval(() => {
        r.update();
      }, 60 * 1000); 
    }
  },`;

const replacement = `  onRegistered(r) {
    if (r) {
      // Check for updates immediately when the tab becomes visible or gains focus
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update();
        }
      });
      window.addEventListener('focus', () => {
        r.update();
      });

      // Also check periodically in the background just in case
      setInterval(() => {
        r.update();
      }, 5 * 60 * 1000); // Every 5 mins is safer to prevent looping
    }
  },`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/main.tsx', content);
    console.log("Patched main.tsx successfully with aggressive update listeners");
} else {
    console.log("Target string not found in main.tsx");
}
