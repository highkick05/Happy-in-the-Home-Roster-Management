const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const apiStr = `
// --- TASKS API ---

app.get('/api/tasks', requireAuth, (req, res) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
    const subTasks = db.prepare("SELECT * FROM sub_tasks").all();
    
    // Attach sub_tasks to tasks
    const tasksWithSubTasks = tasks.map(task => ({
      ...task,
      sub_tasks: subTasks.filter(st => st.task_id === task.id)
    }));
    
    res.json(tasksWithSubTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, status, start_date, end_date, assigned_staff, assigned_clients, sub_tasks } = req.body;
  try {
    const result = db.prepare(\`
      INSERT INTO tasks (title, description, status, start_date, end_date, assigned_staff, assigned_clients)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(title, description, status || 'Active', start_date || null, end_date || null, assigned_staff || '[]', assigned_clients || '[]');
    
    const taskId = result.lastInsertRowid;
    
    if (sub_tasks && Array.isArray(sub_tasks)) {
      const insertSubTask = db.prepare("INSERT INTO sub_tasks (task_id, title, completed) VALUES (?, ?, ?)");
      for (const st of sub_tasks) {
        insertSubTask.run(taskId, st.title, st.completed ? 1 : 0);
      }
    }
    
    res.json({ success: true, id: taskId });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const { title, description, status, start_date, end_date, assigned_staff, assigned_clients, sub_tasks } = req.body;
  const taskId = req.params.id;
  try {
    db.prepare(\`
      UPDATE tasks SET title = ?, description = ?, status = ?, start_date = ?, end_date = ?, assigned_staff = ?, assigned_clients = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    \`).run(title, description, status, start_date || null, end_date || null, assigned_staff || '[]', assigned_clients || '[]', taskId);
    
    if (sub_tasks && Array.isArray(sub_tasks)) {
      // Very naive approach: delete all and recreate
      db.prepare("DELETE FROM sub_tasks WHERE task_id = ?").run(taskId);
      const insertSubTask = db.prepare("INSERT INTO sub_tasks (task_id, title, completed) VALUES (?, ?, ?)");
      for (const st of sub_tasks) {
        insertSubTask.run(taskId, st.title, st.completed ? 1 : 0);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  try {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:id/complete', requireAuth, (req, res) => {
  try {
    db.prepare("UPDATE tasks SET status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subtasks/:id/toggle', requireAuth, (req, res) => {
  const { completed } = req.body;
  try {
    db.prepare("UPDATE sub_tasks SET completed = ? WHERE id = ?").run(completed ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error toggling subtask:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- END TASKS API ---
`;

code = code.replace('// --- MISC / SETTINGS API ---', apiStr + '\n\n// --- MISC / SETTINGS API ---');

fs.writeFileSync(file, code);
