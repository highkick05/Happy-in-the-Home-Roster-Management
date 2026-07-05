const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /const progress = totalSubtasks > 0 \? \(completedSubtasks \/ totalSubtasks\) \* 100 : 0;/;
const replacement = `const totalItems = totalSubtasks + 1;
  const completedItems = completedSubtasks + (task.status === 'Completed' ? 1 : 0);
  const progress = totalSubtasks > 0 ? (completedItems / totalItems) * 100 : 0;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
