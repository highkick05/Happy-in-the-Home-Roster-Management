const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = "v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'} (Force Reload)";
const replacement = "v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'} (Auto-Update Active ✅)";

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Restored the green tick!");
} else {
    console.log("Could not find the target string!");
}
