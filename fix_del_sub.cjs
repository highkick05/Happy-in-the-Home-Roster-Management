const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /onClick=\{\(\) => onDeleteSubTask\(st\.id\)\}/,
  'onClick={(e) => { e.stopPropagation(); onDeleteSubTask(st.id); }}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
