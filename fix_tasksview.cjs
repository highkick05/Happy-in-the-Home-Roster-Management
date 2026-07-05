const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

// 1. add expandedTaskId state
content = content.replace(
  /const \[localDisplayTasks, setLocalDisplayTasks\] = useState<Task\[\]>\(\[\]\);/,
  `const [localDisplayTasks, setLocalDisplayTasks] = useState<Task[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);`
);

// 2. pass down to DraggableTask
content = content.replace(
  /handleToggleImportant=\{handleToggleImportant\}/,
  `handleToggleImportant={handleToggleImportant}
                isExpanded={expandedTaskId === task.id}
                onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}`
);

// 3. inside DraggableTask, receive and pass to TaskCard
content = content.replace(
  /function DraggableTask\(\{(.*?)\}: any\) \{/,
  'function DraggableTask({$1, isExpanded, onToggleExpand}: any) {'
);

content = content.replace(
  /onToggleImportant=\{\(\) => handleToggleImportant\(task\.id\)\}/,
  `onToggleImportant={() => handleToggleImportant(task.id)}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}`
);

// 4. Also fix onComplete to onToggleComplete in TasksView!
content = content.replace(
  /onComplete=\{\(\) => handleComplete\(task\.id\)\}/g,
  'onToggleComplete={() => handleComplete(task.id)}'
);


fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
