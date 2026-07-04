const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
code = code.replace('{task.is_important && (', '{!!task.is_important && (');
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
