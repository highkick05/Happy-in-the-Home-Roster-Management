const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

code = code.replace(
  "import { motion, AnimatePresence, Reorder } from 'motion/react';",
  "import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';"
);

const draggableTaskCode = `
function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList }: any) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={task} dragListener={false} dragControls={dragControls}>
      <TaskCard
        task={task}
        dragControls={dragControls}
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
  );
}
`;

code = code.replace(
  "export function TasksView({",
  draggableTaskCode + "\nexport function TasksView({"
);

code = code.replace(
  /<Reorder\.Item key=\{task\.id\} value=\{task\} className="cursor-grab active:cursor-grabbing">[\s\S]*?<\/Reorder\.Item>/g,
  `<DraggableTask
                key={task.id}
                task={task}
                setEditingTask={setEditingTask}
                setIsModalOpen={setIsModalOpen}
                handleDelete={handleDelete}
                handleComplete={handleComplete}
                toggleSubTask={toggleSubTask}
                addSubTask={addSubTask}
                deleteSubTask={deleteSubTask}
                handleToggleImportant={handleToggleImportant}
                staffList={staffList}
                clientList={clientList}
              />`
);

fs.writeFileSync('src/components/Tasks/TasksView.tsx', code);
