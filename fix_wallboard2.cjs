const fs = require('fs');
let content = fs.readFileSync('src/components/Kiosk/WallboardView.tsx', 'utf8');

content = content.replace(/onComplete=\{async \(\) => \{/g, 'onToggleComplete={async () => {\n                        staffList={staffList}\n                        clientList={clientList}');

fs.writeFileSync('src/components/Kiosk/WallboardView.tsx', content);
