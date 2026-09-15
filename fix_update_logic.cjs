const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf8');

const target = `const updateSW = registerSW({
  onRegistered(r) {
    if (r) {
      // Check immediately
      r.update();
      
      // Check every minute
      setInterval(() => {
        r.update();
      }, 60 * 1000); 

      // Check whenever the window regains focus
      window.addEventListener('focus', () => {
         r.update();
      });
    }
  },`;

const replacement = `const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // When the PWA detects a new version, automatically click refresh for them!
    updateSW(true);
  },
  onRegistered(r) {
    if (r) {
      // Check every minute
      setInterval(() => {
        r.update();
      }, 60 * 1000); 
    }
  },`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/main.tsx', content);
    console.log("Patched main.tsx SW registration!");
} else {
    console.log("Could not find SW registration block!");
}
