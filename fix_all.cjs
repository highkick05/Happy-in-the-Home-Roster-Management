const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// 1. Revert task card click to onEdit
content = content.replace(
  /onClick=\{\(\) => setShowSubtasks\(\!showSubtasks\)\}/,
  'onClick={onEdit}'
);

// 2. Revert the quick actions: remove Edit, add toggle Subtasks
content = content.replace(
  /<button\s*onPointerDown=\{e => e\.stopPropagation\(\)\}\s*onPointerUp=\{e => e\.stopPropagation\(\)\}\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); onEdit\(\); \}\}\s*className="p-1\.5 rounded-md transition-colors text-\[#8B949E\] hover:text-white hover:bg-white\/\[0\.04\]"\s*title="Edit Task"\s*>\s*<Pencil className="w-4 h-4" \/>\s*<\/button>/,
  `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                className={\`p-1.5 rounded-md transition-colors \${showSubtasks ? 'text-brand-teal bg-brand-teal/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}\`}
                title="Toggle Subtasks"
              >
                <ListChecks className="w-4 h-4" />
              </button>`
);

// 3. Remove the new Progress Indicator & Subtasks Toggle we added inside the description area
content = content.replace(
  /\{\/\* Progress Indicator & Subtasks Toggle \*\/\}\s*\{totalSubtasks > 0 && \([\s\S]*?<\/div>\n\s*\)\}/,
  ''
);

// 4. Fix progress percentage
content = content.replace(
  /const progress = totalSubtasks > 0 \? \(completedItems \/ totalItems\) \* 100 : 0;/,
  `const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;`
);

content = content.replace(
  /CheckCircle2, Circle,/,
  'CheckSquare, Square,'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
