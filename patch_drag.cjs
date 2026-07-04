const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldStr = `className={\`flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}
        onClick={onEdit}`;

const newStr = `className={\`flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}
        onClick={onEdit}
        onPointerDown={(e) => {
          if (!wallboardMode && dragControls) {
            dragControls.start(e);
          }
        }}`;

code = code.replace(oldStr, newStr);

const oldToggle = `onClick={handleToggleComplete}`;
const newToggle = `onClick={handleToggleComplete}\n            onPointerDown={(e) => e.stopPropagation()}`;

code = code.replace(oldToggle, newToggle);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
