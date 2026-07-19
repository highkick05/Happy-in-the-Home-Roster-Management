import re

def fix_server(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    migration_code = """
  // Add avatar_url to clients
  try {
    const tableInfoClients = db.prepare("PRAGMA table_info(clients)").all() as any[];
    if (!tableInfoClients.some(col => col.name === 'avatar_url')) {
      db.exec("ALTER TABLE clients ADD COLUMN avatar_url TEXT");
      console.log("[DEBUG] Added avatar_url to clients table.");
    }
  } catch (err) {
    console.error("Migration error avatar_url clients:", err);
  }
"""

    if "avatar_url to clients" not in text:
        text = text.replace(
            "if (!tableInfo.some(col => col.name === 'has_roadside')) db.exec(\"ALTER TABLE vehicles ADD COLUMN has_roadside INTEGER DEFAULT 0\");\n  } catch(e) {}",
            "if (!tableInfo.some(col => col.name === 'has_roadside')) db.exec(\"ALTER TABLE vehicles ADD COLUMN has_roadside INTEGER DEFAULT 0\");\n  } catch(e) {}" + migration_code
        )

    with open(filepath, 'w') as f:
        f.write(text)

fix_server('src/server.ts')
