const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

const target1 = `function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList, handleDragEnd , isExpanded, onToggleExpand}: any) {`;
const repl1 = `function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, editSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList, handleDragEnd , isExpanded, onToggleExpand}: any) {`;

content = content.replace(target1, repl1);

const target2 = `              <DraggableTask
                key={task.id}
                task={task}
                setEditingTask={setEditingTask}
                setIsModalOpen={setIsModalOpen}
                handleDelete={handleDelete}
                handleComplete={handleComplete}
                toggleSubTask={toggleSubTask}
                addSubTask={addSubTask}
                deleteSubTask={deleteSubTask}`;
                
const repl2 = `              <DraggableTask
                key={task.id}
                task={task}
                setEditingTask={setEditingTask}
                setIsModalOpen={setIsModalOpen}
                handleDelete={handleDelete}
                handleComplete={handleComplete}
                toggleSubTask={toggleSubTask}
                editSubTask={editSubTask}
                addSubTask={addSubTask}
                deleteSubTask={deleteSubTask}`;

content = content.replace(target2, repl2);
fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
