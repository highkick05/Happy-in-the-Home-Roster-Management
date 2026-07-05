const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// 1. Ensure card click is onEdit
content = content.replace(
  /onClick=\{\(\) => setShowSubtasks\(\!showSubtasks\)\}/,
  'onClick={onEdit}'
);

// 2. Ensure quick action has Pencil for edit, not ListChecks for toggle
const listChecksBtn = `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                className={\`p-1.5 rounded-md transition-colors \${showSubtasks ? 'text-brand-teal bg-brand-teal/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}\`}
                title="Toggle Subtasks"
              >
                <ListChecks className="w-4 h-4" />
              </button>`;
const pencilBtn = `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-md transition-colors text-[#8B949E] hover:text-white hover:bg-white/[0.04]"
                title="Edit Task"
              >
                <Pencil className="w-4 h-4" />
              </button>`;
content = content.replace(listChecksBtn, pencilBtn);

// 3. Add back the "3/4 Checklist >" button if it's missing
if (!content.includes('Checklist</span>')) {
  const descTarget = `{!!task.description && (
              <p className={\`\${wallboardMode ? 'text-[16px]' : 'text-[12px]'} text-[#8B949E] mt-0.5 truncate\`}>
                {task.description}
              </p>
            )}`;
  
  const descReplacement = `{!!task.description && (
              <p className={\`\${wallboardMode ? 'text-[16px]' : 'text-[12px]'} text-[#8B949E] mt-0.5 truncate\`}>
                {task.description}
              </p>
            )}
            
            {/* Progress Indicator & Subtasks Toggle */}
            {totalSubtasks > 0 && (
               <div 
                 className="flex items-center gap-2 mt-2 w-fit p-1 -ml-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer no-drag-edit" 
                 onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }} 
                 onPointerDown={e => e.stopPropagation()} 
                 onPointerUp={e => e.stopPropagation()}
               >
                  <div className="flex items-center gap-1 text-[11px] text-[#8B949E] font-medium">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{completedSubtasks}/{totalSubtasks} Checklist</span>
                  </div>
                  <div className="ml-1 text-[#8B949E]">
                    {showSubtasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
               </div>
            )}`;
            
  content = content.replace(descTarget, descReplacement);
}

// 4. Ensure progress calculation uses totalItems
const progRegex = /const progress = totalItems > 0 \? \(completedItems \/ totalItems\) \* 100 : 0;/;
if (!progRegex.test(content)) {
  console.log("Progress calc not found, updating...");
  content = content.replace(
    /const progress = totalSubtasks > 0 \? \(completedSubtasks \/ totalSubtasks\) \* 100 : 0;/,
    `const totalItems = totalSubtasks + 1;
  const completedItems = completedSubtasks + (task.status === 'Completed' ? 1 : 0);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;`
  );
}

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
