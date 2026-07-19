import re

def fix_server(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    migration_code = """
  // Auto-assign avatars if missing
  try {
    const clientsWithoutAvatar = db.prepare("SELECT id, first_name FROM clients WHERE avatar_url IS NULL OR avatar_url = ''").all() as any[];
    for (const c of clientsWithoutAvatar) {
      const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(c.first_name || 'Client')}&mouth=smile,twinkle&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      db.prepare("UPDATE clients SET avatar_url = ? WHERE id = ?").run(url, c.id);
    }
    
    const usersWithoutAvatar = db.prepare("SELECT id, first_name FROM users WHERE avatar_url IS NULL OR avatar_url = ''").all() as any[];
    const staffStyles = ["big-ears", "adventurer", "pixel-art"];
    for (const u of usersWithoutAvatar) {
      const style = staffStyles[u.id % staffStyles.length];
      const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(u.first_name || 'Staff')}`;
      db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(url, u.id);
    }
    console.log("[DEBUG] Auto-assigned missing avatars.");
  } catch (err) {
    console.error("Migration error auto-assigning avatars:", err);
  }
"""

    if "Auto-assign avatars if missing" not in text:
        text = text.replace(
            "console.log(\"[DEBUG] Added avatar_url to clients table.\");\n    }\n  } catch (err) {\n    console.error(\"Migration error avatar_url clients:\", err);\n  }",
            "console.log(\"[DEBUG] Added avatar_url to clients table.\");\n    }\n  } catch (err) {\n    console.error(\"Migration error avatar_url clients:\", err);\n  }\n" + migration_code
        )

    with open(filepath, 'w') as f:
        f.write(text)

fix_server('src/server.ts')
