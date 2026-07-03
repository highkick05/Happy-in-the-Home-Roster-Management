const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

content = content.replace(
  "import { motion, AnimatePresence } from 'motion/react';",
  "import { motion, AnimatePresence, Reorder } from 'motion/react';"
);

content = content.replace(
  /type Task = \{[\s\S]*?end_date: string \| null;/g,
  "type Task = {\n  id: number;\n  title: string;\n  description: string;\n  status: 'Active' | 'Completed';\n  start_date: string | null;\n  end_date: string | null;\n  sort_order?: number;"
);

const handleReorderCode = `
  const handleReorder = async (reordered: Task[]) => {
    const reorderedWithSortOrder = reordered.map((t, index) => ({ ...t, sort_order: index }));
    setTasks(prev => prev.map(t => {
      const match = reorderedWithSortOrder.find(r => r.id === t.id);
      return match ? match : t;
    }));

    try {
      await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ tasks: reorderedWithSortOrder.map(t => ({ id: t.id, sort_order: t.sort_order })) })
      });
    } catch(err) {
      console.error(err);
    }
  };
`;

content = content.replace("  const filteredTasks = tasks.filter", handleReorderCode + "\n  const filteredTasks = tasks.filter");

content = content.replace(
  /const filteredTasks = tasks\.filter\(t => t\.status === activeTab\)\.sort\(\(a, b\) => \{[\s\S]*?return b\.id - a\.id;\n  \}\);/g,
  `const filteredTasks = tasks.filter(t => t.status === activeTab).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    }
    if (a.is_important !== b.is_important) {
      return (b.is_important || 0) - (a.is_important || 0);
    }
    return b.id - a.id;
  });`
);

content = content.replace(
  /<div className="flex flex-col gap-1\.5">\s*\{filteredTasks\.map\(task => \(\s*<TaskCard[\s\S]*?\/>\s*\)\)\}\s*<\/div>/g,
  `<Reorder.Group axis="y" values={filteredTasks} onReorder={handleReorder} className="flex flex-col gap-1.5">
            {filteredTasks.map(task => (
              <Reorder.Item key={task.id} value={task} className="cursor-grab active:cursor-grabbing">
                <TaskCard
                  task={task}
                  onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                  onDelete={() => handleDelete(task.id)}
                  onComplete={() => handleComplete(task.id)}
                  onToggleSubTask={toggleSubTask}
                  onAddSubTask={addSubTask}
                  onDeleteSubTask={deleteSubTask}
                  onToggleImportant={() => handleToggleImportant(task.id)}
                  staffList={staffList}
                  clientList={clientList}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>`
);

fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
