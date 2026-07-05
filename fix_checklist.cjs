const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// 1. Change card click to setShowSubtasks
content = content.replace(
  /className=\{\`relative z-10 flex flex-col md:flex-row md:items-center \$\{wallboardMode \? 'p-4 gap-4' : 'px-4 py-3 gap-3'\} cursor-pointer select-none\`\}\n        onClick=\{onEdit\}/,
  `className={\`relative z-10 flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}
        onClick={() => setShowSubtasks(!showSubtasks)}`
);

// 2. Remove the "X/Y Checklist >" button
const checklistToggleRegex = /\{\/\* Progress Indicator & Subtasks Toggle \*\/.*?\{\s*totalSubtasks > 0 && \(\s*<div.*?<\/div>\s*\)\}/s;
content = content.replace(checklistToggleRegex, '');

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
