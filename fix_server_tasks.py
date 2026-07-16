import re

with open("src/server.ts", "r") as f:
    code = f.read()

# Fix POST
code = code.replace(
'''  app.post('/api/tasks', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments } = req.body;
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO tasks (title, description, status, due_date, category_id, attachments)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(title, description, status || 'To Do', due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]');''',
'''  app.post('/api/tasks', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments, assigned_to_id } = req.body;
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO tasks (title, description, status, due_date, category_id, attachments, assigned_to_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(title, description, status || 'To Do', due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]', assigned_to_id || null);'''
)

# Fix PUT
code = code.replace(
'''  app.put('/api/tasks/:id', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments } = req.body;
    const taskId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, category_id = ?, attachments = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, status, due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]', taskId);''',
'''  app.put('/api/tasks/:id', authenticateTokenOrWallboard, (req: any, res: any) => {
    const { title, description, status, due_date, category_id, sub_tasks, staff_ids, client_ids, attachments, assigned_to_id } = req.body;
    const taskId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, category_id = ?, attachments = ?, assigned_to_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, status, due_date || null, category_id || null, attachments ? JSON.stringify(attachments) : '[]', assigned_to_id || null, taskId);'''
)

with open("src/server.ts", "w") as f:
    f.write(code)
