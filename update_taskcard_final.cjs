const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /const \[newSubTask, setNewSubTask\] = useState\(''\);/,
  `const [newSubTask, setNewSubTask] = useState('');
  const [localCompleted, setLocalCompleted] = useState(false);`
);

content = content.replace(
  /const isChecked = task\.status === 'Completed';/,
  `const isChecked = task.status === 'Completed' || localCompleted;`
);

content = content.replace(
  /const handleToggleComplete = \(e: any\) => \{\n    e\.stopPropagation\(\);\n    onToggleComplete\(\);\n  \};/,
  `const handleToggleComplete = (e: any) => {
    e.stopPropagation();
    if (!isChecked && task.status !== 'Completed') {
      setLocalCompleted(true);
      setTimeout(() => {
        onToggleComplete();
      }, 700);
    } else {
      onToggleComplete();
    }
  };`
);

// Add the progress count on the right
const targetRight = `                </div>
              )}
            </div>
          )}
          {/* Quick Actions */}`;

const replacementRight = `                </div>
              )}
            </div>
          )}
          
          {/* Subtask count */}
          {totalSubtasks > 0 && (
             <div className="flex items-center gap-1 text-[11px] text-[#8B949E] font-medium border-l border-border-subtle/50 pl-3 ml-1" title="Checklist Progress">
                <ListChecks className="w-3.5 h-3.5" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
             </div>
          )}
          
          {/* Quick Actions */}`;

content = content.replace(targetRight, replacementRight);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
