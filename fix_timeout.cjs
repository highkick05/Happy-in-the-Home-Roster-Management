const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /setTimeout\(\(\) => \{\n        onToggleComplete\(\);\n      \}, 700\);/,
  `setTimeout(() => {
        onToggleComplete();
      }, 850);`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
