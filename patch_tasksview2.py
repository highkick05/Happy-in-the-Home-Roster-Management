import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Remove the header
header_pattern = re.compile(
    r'<div className="flex-none px-3 py-2 flex items-center justify-between border-b border-border-subtle bg-brand-navy">.*?</div>\s*<div className="flex-1 overflow-x-auto',
    re.DOTALL
)

code = header_pattern.sub('<div className="flex-1 overflow-x-auto', code)

# Add handleToggleSubtask
toggle_code = """
  const handleToggleSubtask = async (task: any, subtaskId: number) => {
    const updatedSubTasks = (task.sub_tasks || []).map((st: any) => st.id === subtaskId ? { ...st, completed: st.completed ? 0 : 1 } : st);
    const updatedTask = {
      ...task,
      sub_tasks: updatedSubTasks,
      staff_ids: task.staff?.map((s: any) => s.id) || task.assigned_staff_parsed || [],
      client_ids: task.clients?.map((c: any) => c.id) || task.assigned_clients_parsed || []
    };
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async (taskData: any) => {
"""

code = code.replace("  const handleSaveTask = async (taskData: any) => {", toggle_code)

# Add onToggleSubtask to TaskCard
code = code.replace(
    """<TaskCard
                                  task={task}
                                  provided={provided}
                                  snapshot={snapshot}
                                  onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                                  wallboardMode={false}
                                />""",
    """<TaskCard
                                  task={task}
                                  provided={provided}
                                  snapshot={snapshot}
                                  onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                                  onToggleSubtask={handleToggleSubtask}
                                  wallboardMode={false}
                                />"""
)

# Add onManageCategories to TaskModal
code = code.replace(
    """<TaskModal
          task={editingTask}
          staffList={staffList}
          clientList={clientList}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={(editingTask && editingTask.id) ? () => handleDeleteTask(editingTask.id) : undefined}
        />""",
    """<TaskModal
          task={editingTask}
          staffList={staffList}
          clientList={clientList}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={(editingTask && editingTask.id) ? () => handleDeleteTask(editingTask.id) : undefined}
          onManageCategories={() => { setIsModalOpen(false); setIsCategoryModalOpen(true); }}
        />"""
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
