const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /onClick=\{\(\) => onToggleSubTask\(st\.id, \!\!st\.completed\)\}/,
  'onClick={(e) => { e.stopPropagation(); onToggleSubTask(st.id, !!st.completed); }}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
