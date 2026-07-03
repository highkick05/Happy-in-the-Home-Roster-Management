const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  "export function TaskCard({ task, onEdit, onDelete, onComplete, onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant, staffList, clientList }: any) {",
  "export function TaskCard({ task, onEdit, onDelete, onComplete, onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant, staffList, clientList, wallboardMode = false }: any) {"
);

// Scale up Title text
content = content.replace(
  "text-[15px] tracking-tight leading-snug",
  "${wallboardMode ? 'text-[22px]' : 'text-[15px]'} tracking-tight leading-snug"
);

// Scale up description text
content = content.replace(
  "text-[#8B949E] text-[13px] line-clamp-2 leading-relaxed",
  "text-[#8B949E] ${wallboardMode ? 'text-[18px]' : 'text-[13px]'} line-clamp-2 leading-relaxed"
);

// Scale up Dates/Assignments area (it is currently "text-[13px]")
content = content.replace(
  "w-72 shrink-0 text-[13px] text-[#8B949E]",
  "w-72 shrink-0 ${wallboardMode ? 'text-[16px] w-96' : 'text-[13px]'} text-[#8B949E]"
);

// Scale up subtasks text
content = content.replace(
  "text-xs font-semibold text-[#8B949E]",
  "${wallboardMode ? 'text-[15px]' : 'text-xs'} font-semibold text-[#8B949E]"
);
content = content.replace(
  /className=\{\`text-xs \$\{st\.completed \? 'text-\[\#8B949E\] line-through' : 'text-\[\#E6EDF3\]'\}\`\}/g,
  "className={`\\${wallboardMode ? 'text-[16px]' : 'text-xs'} \\${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}"
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
