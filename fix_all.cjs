const fs = require('fs');

let wb = fs.readFileSync('src/components/Kiosk/WallboardView.tsx', 'utf8');
wb = wb.replace(/                        staffList=\{staffList\}\n                        clientList=\{clientList\}\n                      \/>/g, '                      />');
fs.writeFileSync('src/components/Kiosk/WallboardView.tsx', wb);

let tc = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
tc = tc.replace(/  wallboardMode,\n  dragControls,\n  staffList,\n  clientList\n\}: any\) \{/g, '  wallboardMode,\n  dragControls,\n  staffList,\n  clientList,\n  onToggleImportant\n}: any) {');
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', tc);
