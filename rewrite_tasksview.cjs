const fs = require('fs');

let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

content = content.replace(
  /<Reorder\.Group axis="y" values=\{filteredTasks\} onReorder=\{handleReorder\} className="flex flex-col gap-1\.5">/,
  '<Reorder.Group axis="y" values={filteredTasks} onReorder={handleReorder} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">'
);

fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
