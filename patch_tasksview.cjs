const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

// Add localDisplayTasks state
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');",
  "const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');\n  const [localDisplayTasks, setLocalDisplayTasks] = useState<Task[]>([]);"
);

// Add useEffect
code = code.replace(
  "const filteredTasks = tasks.filter(t => t.status === activeTab).sort((a, b) => {",
  `useEffect(() => {
    const filtered = tasks.filter(t => t.status === activeTab).sort((a, b) => {
      if (a.is_important !== b.is_important) {
        return (b.is_important || 0) - (a.is_important || 0);
      }
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return b.id - a.id;
    });
    setLocalDisplayTasks(filtered);
  }, [tasks, activeTab]);

  const handleDragEnd = async () => {
    const reorderedWithSortOrder = localDisplayTasks.map((t, index) => ({ ...t, sort_order: index }));
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

  const filteredTasks = tasks.filter(t => t.status === activeTab).sort((a, b) => {`
);

// Change handleReorder to just update localDisplayTasks
code = code.replace(
  /const handleReorder = async \(reordered: Task\[\]\) => \{[\s\S]*?console\.error\(err\);\n    \}\n  \};/m,
  `const handleReorder = (newOrder: Task[]) => {
    setLocalDisplayTasks(newOrder);
  };`
);

// Delete the old filteredTasks definition that we left in above (because we replaced it with useEffect AND kept it below to avoid errors if we miss replacing its usage, but we should replace its usage with localDisplayTasks)
code = code.replace(
  /const filteredTasks = tasks\.filter\(t => t\.status === activeTab\)\.sort\(\(a, b\) => \{[\s\S]*?return b\.id - a\.id;\n  \}\);/m,
  ""
);

// Replace filteredTasks with localDisplayTasks
code = code.replace(/filteredTasks/g, "localDisplayTasks");

// Update DraggableTask props in map
code = code.replace(
  /staffList=\{staffList\}\n                clientList=\{clientList\}/g,
  "staffList={staffList}\n                clientList={clientList}\n                handleDragEnd={handleDragEnd}"
);

// Update DraggableTask signature and Reorder.Item
code = code.replace(
  "function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList }: any)",
  "function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList, handleDragEnd }: any)"
);

code = code.replace(
  "<Reorder.Item value={task} dragListener={false} dragControls={dragControls}>",
  "<Reorder.Item value={task} dragListener={false} dragControls={dragControls} onDragEnd={handleDragEnd}>"
);

fs.writeFileSync('src/components/Tasks/TasksView.tsx', code);
