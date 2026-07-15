import re

with open("src/server.ts", "r") as f:
    code = f.read()

# Replace the block from `app.get('/api/tasks'` to the end of `app.post('/api/tasks/:id/complete'`
# Since the lines might have changed, we'll use regex.

new_endpoints = """
  // --- Task Categories API ---
  app.get('/api/task-categories', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      const categories = db.prepare("SELECT * FROM task_categories").all();
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/task-categories', authenticateToken, (req: any, res: any) => {
    const { name, color_hex } = req.body;
    try {
      const result = db.prepare("INSERT INTO task_categories (name, color_hex) VALUES (?, ?)").run(name, color_hex);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/task-categories/:id', authenticateToken, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM task_categories WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Tasks API ---
  app.get('/api/tasks', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      // First get all tasks with their category
      const tasks = db.prepare(`
        SELECT 
          t.*, 
          tc.name as category_name, 
          tc.color_hex as category_color 
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        ORDER BY t.created_at DESC
      `).all();

      const subTasks = db.prepare("SELECT * FROM sub_tasks").all();
      
      const taskStaff = db.prepare(`
        SELECT ts.task_id, u.id, u.first_name, u.last_name, u.avatar
        FROM task_staff ts
        JOIN users u ON ts.staff_id = u.id
      `).all();
      
      const taskClients = db.prepare(`
        SELECT tc.task_id, c.id, c.first_name, c.last_name
        FROM task_clients tc
        JOIN clients c ON tc.client_id = c.id
      `).all();

      const tasksWithRelations = tasks.map((task: any) => ({
        ...task,
        sub_tasks: subTasks.filter((st: any) => st.task_id === task.id),
        staff: taskStaff.filter((ts: any) => ts.task_id === task.id).map((ts: any) => ({
           id: ts.id, name: `${ts.first_name} ${ts.last_name}`, avatar: ts.avatar
        })),
        clients: taskClients.filter((tc: any) => tc.task_id === task.id).map((tc: any) => ({
           id: tc.id, name: `${tc.first_name} ${tc.last_name}`
        })),
        // Fallbacks for existing data
        assigned_staff_parsed: task.assigned_staff ? JSON.parse(task.assigned_staff) : [],
        assigned_clients_parsed: task.assigned_clients ? JSON.parse(task.assigned_clients) : []
      }));
      
      res.json(tasksWithRelations);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tasks', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids } = req.body;
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO tasks (title, description, status, due_date, category_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(title, description, status || 'To Do', due_date || null, category_id || null);
        
        const taskId = result.lastInsertRowid;
        
        if (sub_tasks && Array.isArray(sub_tasks)) {
          const insertSubTask = db.prepare("INSERT INTO sub_tasks (task_id, title, completed) VALUES (?, ?, ?)");
          for (const st of sub_tasks) {
            insertSubTask.run(taskId, st.title, st.completed ? 1 : 0);
          }
        }
        
        if (staff_ids && Array.isArray(staff_ids)) {
          const insertStaff = db.prepare("INSERT INTO task_staff (task_id, staff_id) VALUES (?, ?)");
          for (const sId of staff_ids) {
            insertStaff.run(taskId, sId);
          }
        }
        
        if (client_ids && Array.isArray(client_ids)) {
          const insertClient = db.prepare("INSERT INTO task_clients (task_id, client_id) VALUES (?, ?)");
          for (const cId of client_ids) {
            insertClient.run(taskId, cId);
          }
        }
      })();
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/tasks/:id/status', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      db.prepare("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.body.status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/tasks/:id', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids } = req.body;
    const taskId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, status, due_date || null, category_id || null, taskId);
        
        if (sub_tasks && Array.isArray(sub_tasks)) {
          db.prepare("DELETE FROM sub_tasks WHERE task_id = ?").run(taskId);
          const insertSubTask = db.prepare("INSERT INTO sub_tasks (task_id, title, completed) VALUES (?, ?, ?)");
          for (const st of sub_tasks) {
            insertSubTask.run(taskId, st.title, st.completed ? 1 : 0);
          }
        }
        
        if (staff_ids && Array.isArray(staff_ids)) {
          db.prepare("DELETE FROM task_staff WHERE task_id = ?").run(taskId);
          const insertStaff = db.prepare("INSERT INTO task_staff (task_id, staff_id) VALUES (?, ?)");
          for (const sId of staff_ids) {
            insertStaff.run(taskId, sId);
          }
        }
        
        if (client_ids && Array.isArray(client_ids)) {
          db.prepare("DELETE FROM task_clients WHERE task_id = ?").run(taskId);
          const insertClient = db.prepare("INSERT INTO task_clients (task_id, client_id) VALUES (?, ?)");
          for (const cId of client_ids) {
            insertClient.run(taskId, cId);
          }
        }
      })();
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tasks/:id', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: error.message });
    }
  });
"""

start_str = "app.get('/api/tasks', authenticateTokenOrWallboard,"
end_str = "app.post('/api/tasks/:id/complete', authenticateTokenOrWallboard, (req: any, res: any) => {"

start_idx = code.find(start_str)
end_idx = code.find("});", code.find(end_str)) + 3

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_endpoints + code[end_idx:]
    with open("src/server.ts", "w") as f:
        f.write(code)
    print("Successfully replaced endpoints.")
else:
    print("Could not find endpoints.")

