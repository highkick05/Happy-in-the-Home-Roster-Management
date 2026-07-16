import re

with open("src/server.ts", "r") as f:
    code = f.read()

migration_block = """  try {
    db.exec("ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES task_categories(id) ON DELETE SET NULL");
    console.log("[DEBUG] Added category_id to tasks.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning for tasks category_id:", e.message);
    }
  }"""

new_migration_block = """  try {
    db.exec("ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES task_categories(id) ON DELETE SET NULL");
    console.log("[DEBUG] Added category_id to tasks.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning for tasks category_id:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER");
    console.log("[DEBUG] Added assigned_to_id to tasks.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning for tasks assigned_to_id:", e.message);
    }
  }
  
  try {
    db.exec("ALTER TABLE task_categories ADD COLUMN sort_order INTEGER DEFAULT 0");
    console.log("[DEBUG] Added sort_order to task_categories.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning for task_categories sort_order:", e.message);
    }
  }"""

if migration_block in code:
    code = code.replace(migration_block, new_migration_block)
else:
    print("WARNING: migration_block not found. I will try fallback.")
    code = code.replace(
        "try {\n    const existingCats = db.prepare(\"SELECT COUNT(*) as count FROM task_categories\").get() as any;",
        """try {
    db.exec("ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER");
  } catch (e: any) {}
  try {
    db.exec("ALTER TABLE task_categories ADD COLUMN sort_order INTEGER DEFAULT 0");
  } catch (e: any) {}
  
  try {
    const existingCats = db.prepare("SELECT COUNT(*) as count FROM task_categories").get() as any;"""
    )
    
with open("src/server.ts", "w") as f:
    f.write(code)
