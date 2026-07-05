const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const targetStr = `            </div>
          )}
          {/* Quick Actions */}`;

const replacementStr = `            </div>
          )}
          {/* Subtask count */}
          {totalSubtasks > 0 && (
             <div className="flex items-center gap-1 text-[11px] text-[#8B949E] font-medium border-l border-border-subtle/50 pl-3 ml-1" title="Checklist Progress">
                <ListChecks className="w-3.5 h-3.5" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
             </div>
          )}
          {/* Quick Actions */}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
