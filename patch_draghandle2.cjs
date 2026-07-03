const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace(
  /onPointerUp=\{\(e\) => e\.stopPropagation\(\)\}\s*onClick=\{\(e\) => e\.stopPropagation\(\)\}/,
  'onClick={(e) => e.stopPropagation()}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
