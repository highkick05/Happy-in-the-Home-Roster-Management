import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Add handleToggleTaskStatus
toggle_subtask_pattern = re.compile(r'(const handleToggleSubtask = async \(task: any, subtaskId: number\) => \{)', re.DOTALL)
new_toggle = """const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
    const updatedTask = {
      ...task,
      status: newStatus,
      staff_ids: task.staff?.map((s: any) => s.id) || task.assigned_staff_parsed || [],
      client_ids: task.clients?.map((c: any) => c.id) || task.assigned_clients_parsed || []
    };
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  \\1"""

code = toggle_subtask_pattern.sub(new_toggle, code, count=1)

# Pass to TaskCard
pass_pattern = re.compile(r'(onToggleSubtask=\{handleToggleSubtask\})', re.DOTALL)
code = pass_pattern.sub(r'\1\n                                          onToggleTaskStatus={handleToggleTaskStatus}', code, count=1)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
