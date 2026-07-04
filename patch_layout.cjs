const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
code = code.replace(
  "<motion.div \n      layout\n      className",
  "<motion.div \n      layout={!dragControls}\n      className"
);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
