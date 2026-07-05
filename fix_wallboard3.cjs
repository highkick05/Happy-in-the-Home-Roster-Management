const fs = require('fs');
let content = fs.readFileSync('src/components/Kiosk/WallboardView.tsx', 'utf8');

const regex = /onToggleComplete=\{async \(\) => \{\n                        staffList=\{staffList\}\n                        clientList=\{clientList\}/g;
const replacement = `staffList={staffList}\n                        clientList={clientList}\n                        onToggleComplete={async () => {`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Kiosk/WallboardView.tsx', content);
