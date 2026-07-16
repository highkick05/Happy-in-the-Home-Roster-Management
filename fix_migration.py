import re

with open("src/server.ts", "r") as f:
    code = f.read()

old_block = """  try {
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
  }"""

new_block = """  try {
    const existingCats = db.prepare("SELECT COUNT(*) as count FROM task_categories").get() as any;
    if (existingCats.count === 0) {
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('To Do', '#8B949E', 0)").run();
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('In Progress', '#6366F1', 1)").run();
      db.prepare("INSERT INTO task_categories (name, color_hex, sort_order) VALUES ('Done', '#10B981', 2)").run();
      console.log("[DEBUG] Seeded default task categories.");
    }
    
    // Always attempt to migrate orphaned tasks regardless of whether we just seeded
    const cats = db.prepare("SELECT * FROM task_categories ORDER BY sort_order ASC").all() as any[];
    if (cats.length > 0) {
      const todoId = cats.find(c => c.name === 'To Do')?.id || cats[0].id;
      const inProgressId = cats.find(c => c.name === 'In Progress')?.id || cats[0].id;
      const doneId = cats.find(c => c.name === 'Done')?.id || cats[0].id;
      
      db.prepare("UPDATE tasks SET category_id = ? WHERE (status = 'To Do' OR status = 'Active') AND category_id IS NULL").run(todoId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE status = 'In Progress' AND category_id IS NULL").run(inProgressId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE (status = 'Done' OR status = 'COMPLETED') AND category_id IS NULL").run(doneId);
      db.prepare("UPDATE tasks SET category_id = ? WHERE category_id IS NULL").run(todoId); // fallback for any remaining orphaned tasks
    }
  } catch(e: any) {
    console.warn("Migration warning for task_categories seed:", e.message);
  }"""

if old_block in code:
    code = code.replace(old_block, new_block)
else:
    print("WARNING: Could not find exact old block to replace!")

with open("src/server.ts", "w") as f:
    f.write(code)
