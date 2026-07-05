const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /<AnimatePresence>/,
  '<AnimatePresence initial={false}>'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
