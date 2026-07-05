const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /\{totalSubtasks > 0 && \([\s\S]*?<span className="text-xs bg-zinc-500\/20 text-zinc-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider mr-3">[\s\S]*?\{completedSubtasks\}\/\{totalSubtasks\} Subtasks[\s\S]*?<\/span>[\s\S]*?\)\}/;
const replacement = `{totalSubtasks > 0 && task.status !== 'Completed' && (
              <span className="text-xs font-bold text-brand-teal px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider mr-3 bg-brand-teal/10">
                {Math.round(progress)}% Complete
              </span>
            )}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
