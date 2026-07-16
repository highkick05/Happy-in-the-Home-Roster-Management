import re

with open("src/server.ts", "r") as f:
    code = f.read()

seed_code = """
  try {
    const existingCats = db.prepare("SELECT COUNT(*) as count FROM task_categories").get() as any;
    if (existingCats.count === 0) {
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('To Do', '#8B949E', 0)").run();
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('In Progress', '#6366F1', 1)").run();
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('Done', '#10B981', 2)").run();
      console.log("[DEBUG] Seeded default task categories.");
      
      // Migrate existing tasks if they have category_id = NULL
      const cats = db.prepare("SELECT * FROM task_categories").all() as any[];
      const todoId = cats.find(c => c.name === 'To Do').id;
      const inProgressId = cats.find(c => c.name === 'In Progress').id;
      const doneId = cats.find(c => c.name === 'Done').id;
      
      db.prepare("UPDATE tasks SET category_id = ? WHERE status = 'To Do' AND category_id IS NULL").run(todoId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE status = 'In Progress' AND category_id IS NULL").run(inProgressId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE status = 'Done' AND category_id IS NULL").run(doneId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE category_id IS NULL").run(todoId); // fallback
    }
  } catch(e: any) {
    console.warn("Migration warning for task_categories seed:", e.message);
  }
"""

pattern = re.compile(r'(\n\s*console\.log\("\[DEBUG\] Completed invoices\.merged_into_shift_id column check\."\);\n\s*\} catch \(e: any\) \{\n\s*if \(e\.message && !e\.message\.includes\("duplicate column"\)\) console\.warn\("Migration warning:", e\.message\);\n\s*\})', re.DOTALL)

code = pattern.sub(r'\1' + '\n' + seed_code, code)

with open("src/server.ts", "w") as f:
    f.write(code)
