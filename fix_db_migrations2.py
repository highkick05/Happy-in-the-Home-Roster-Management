import re

def fix_server(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    migration_code = """
  // Add avatar_url to clients
  try {
    const tableInfo = db.prepare("PRAGMA table_info(clients)").all() as any[];
    const hasCol = tableInfo.some(col => col.name === 'avatar_url');
    if (!hasCol) {
      db.exec("ALTER TABLE clients ADD COLUMN avatar_url TEXT");
      console.log("[DEBUG] Added avatar_url to clients table.");
    }
  } catch (err) {
    console.error("Migration error avatar_url clients:", err);
  }
"""

    if "avatar_url to clients" not in text:
        text = text.replace(
            "// 2. We can create a new table and copy data, or we can just leave it as is if it works.",
            "// 2. We can create a new table and copy data, or we can just leave it as is if it works.\n" + migration_code
        )

    with open(filepath, 'w') as f:
        f.write(text)

fix_server('src/server.ts')
