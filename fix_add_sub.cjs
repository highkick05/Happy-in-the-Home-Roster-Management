const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /onClick=\{handleAddSubTask\}/,
  'onClick={(e) => { e.stopPropagation(); handleAddSubTask(); }}'
);

content = content.replace(
  /onKeyDown=\{e => e\.key === 'Enter' && \(e\.preventDefault\(\), handleAddSubTask\(\)\)\}/,
  'onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); handleAddSubTask(); } }}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
