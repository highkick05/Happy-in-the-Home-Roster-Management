import re

with open("src/server.ts", "r") as f:
    code = f.read()

# Update the SELECT query in GET /api/tasks
select_query = """      const tasks = db.prepare(`
        SELECT 
          t.*, 
          tc.name as category_name, 
          tc.color_hex as category_color,
          u.first_name as assigned_first_name,
          u.last_name as assigned_last_name
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.assigned_to_id = u.id
        ORDER BY t.created_at DESC
      `).all();"""

code = re.sub(r'const tasks = db\.prepare\(`\s*SELECT \s*t\.\*, \s*tc\.name as category_name, \s*tc\.color_hex as category_color\s*FROM tasks t\s*LEFT JOIN task_categories tc ON t\.category_id = tc\.id\s*ORDER BY t\.created_at DESC\s*`\)\.all\(\);', select_query, code)

# Update POST /api/tasks
post_pattern = re.compile(r"const stmt = db\.prepare\(`\s*INSERT INTO tasks \(title, description, status, due_date, category_id, attachments\)\s*VALUES \(\?, \?, \?, \?, \?, \?\)\s*`\);", re.DOTALL)
new_post = """const stmt = db.prepare(`
        INSERT INTO tasks (title, description, status, due_date, category_id, attachments, assigned_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);"""
code = post_pattern.sub(new_post, code, count=1)

# Update POST bind parameters
post_run_pattern = re.compile(r"stmt\.run\(\s*title,\s*description \|\| null,\s*status \|\| 'To Do',\s*due_date \|\| null,\s*category_id \|\| null,\s*JSON\.stringify\(attachments \|\| \[\]\)\s*\);", re.DOTALL)
new_post_run = """stmt.run(
        title,
        description || null,
        status || 'To Do',
        due_date || null,
        category_id || null,
        JSON.stringify(attachments || []),
        req.body.assigned_to_id || null
      );"""
code = post_run_pattern.sub(new_post_run, code, count=1)


# Update PUT /api/tasks/:id
put_pattern = re.compile(r"const stmt = db\.prepare\(`\s*UPDATE tasks SET\s*title = \?,\s*description = \?,\s*status = \?,\s*due_date = \?,\s*category_id = \?,\s*attachments = \?\s*WHERE id = \?\s*`\);", re.DOTALL)
new_put = """const stmt = db.prepare(`
        UPDATE tasks SET
          title = ?,
          description = ?,
          status = ?,
          due_date = ?,
          category_id = ?,
          attachments = ?,
          assigned_to_id = ?
        WHERE id = ?
      `);"""
code = put_pattern.sub(new_put, code, count=1)

# Update PUT bind parameters
put_run_pattern = re.compile(r"stmt\.run\(\s*title,\s*description \|\| null,\s*status \|\| 'To Do',\s*due_date \|\| null,\s*category_id \|\| null,\s*JSON\.stringify\(attachments \|\| \[\]\),\s*req\.params\.id\s*\);", re.DOTALL)
new_put_run = """stmt.run(
        title,
        description || null,
        status || 'To Do',
        due_date || null,
        category_id || null,
        JSON.stringify(attachments || []),
        req.body.assigned_to_id || null,
        req.params.id
      );"""
code = put_run_pattern.sub(new_put_run, code, count=1)

with open("src/server.ts", "w") as f:
    f.write(code)
