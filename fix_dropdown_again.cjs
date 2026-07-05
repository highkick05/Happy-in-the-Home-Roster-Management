const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /\{\!\!task\.description && \([\s\S]*?<\/p>\n            \)\}\n\s*<\/div>/;

const replacement = `{!!task.description && (
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
                    <span>{completedItems}/{totalItems} Checklist</span>
                  </div>
                  <div className="ml-1 text-[#8B949E]">
                    {showSubtasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
               </div>
            )}
          </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
