import re

with open("src/server.ts", "r") as f:
    code = f.read()

migration_sql = """
      CREATE TABLE IF NOT EXISTS task_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color_hex TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS task_staff (
        task_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, staff_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS task_clients (
        task_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, client_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
"""

# add to db.exec block where tasks is created
target = "CREATE TABLE IF NOT EXISTS tasks ("
if "CREATE TABLE IF NOT EXISTS task_categories" not in code:
    code = code.replace(target, migration_sql + "\n      " + target)

# Also we need to add category_id to tasks if it doesn't exist
migration_script = """
    // Migration for tasks
    try {
      const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as any[];
      if (!taskCols.some(c => c.name === 'category_id')) {
        db.exec("ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES task_categories(id) ON DELETE SET NULL");
      }
    } catch(e) {}
"""
if "ALTER TABLE tasks ADD COLUMN category_id" not in code:
    t2 = 'console.log("[DEBUG] Completed client_ledger_entries table setup.");'
    code = code.replace(t2, t2 + "\n" + migration_script)

with open("src/server.ts", "w") as f:
    f.write(code)
