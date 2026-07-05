const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  `Trash2, ListChecks`,
  `Trash2, ListChecks, Pencil`
);

content = content.replace(
  `<div \n        className={\`relative z-10 flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}\n        onClick={onEdit}\n      >`,
  `<div \n        className={\`relative z-10 flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}\n        onClick={() => setShowSubtasks(!showSubtasks)}\n      >`
);

const oldQuickActions = `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                className={\`p-1.5 rounded-md transition-colors \${showSubtasks ? 'text-brand-teal bg-brand-teal/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}\`}
                title="Toggle Subtasks"
              >
                <ListChecks className="w-4 h-4" />
              </button>`;

const newQuickActions = `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-md transition-colors text-[#8B949E] hover:text-white hover:bg-white/[0.04]"
                title="Edit Task"
              >
                <Pencil className="w-4 h-4" />
              </button>`;

content = content.replace(oldQuickActions, newQuickActions);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
