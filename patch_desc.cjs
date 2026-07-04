const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
code = code.replace('{task.description && (', '{!!task.description && (');
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
