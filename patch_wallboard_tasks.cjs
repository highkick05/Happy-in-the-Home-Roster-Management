const fs = require('fs');
let content = fs.readFileSync('src/components/Kiosk/WallboardView.tsx', 'utf8');

content = content.replace(
  /<TaskCard\s*key=\{task\.id\}/g,
  '<TaskCard\n                        wallboardMode={true}\n                        key={task.id}'
);

fs.writeFileSync('src/components/Kiosk/WallboardView.tsx', content);
