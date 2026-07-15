import re

with open("src/server.ts", "r") as f:
    code = f.read()

# Add attachments to GET
code = code.replace(
'''        // Fallbacks for existing data
        assigned_staff_parsed: task.assigned_staff ? JSON.parse(task.assigned_staff) : [],''',
'''        attachments: task.attachments ? JSON.parse(task.attachments) : [],
        // Fallbacks for existing data
        assigned_staff_parsed: task.assigned_staff ? JSON.parse(task.assigned_staff) : [],'''
)

# Add attachments to POST
code = code.replace(
'''const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids } = req.body;
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO tasks (title, description, status, due_date, category_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(title, description, status || 'To Do', due_date || null, category_id || null);''',
'''const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments } = req.body;
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO tasks (title, description, status, due_date, category_id, attachments)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(title, description, status || 'To Do', due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]');'''
)

# Add attachments to PUT
code = code.replace(
'''const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids } = req.body;
    const taskId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, status, due_date || null, category_id || null, taskId);''',
'''const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments } = req.body;
    const taskId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, category_id = ?, attachments = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, status, due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]', taskId);'''
)

# Add file upload endpoint
upload_endpoint = '''  app.post('/api/tasks/upload-attachment', authenticateToken, upload.single('file'), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.originalname, size: req.file.size });
  });

  app.delete('/api/task-categories/:id','''
code = code.replace("  app.delete('/api/task-categories/:id',", upload_endpoint)


with open("src/server.ts", "w") as f:
    f.write(code)
