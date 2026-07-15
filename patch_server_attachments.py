import re

with open("src/server.ts", "r") as f:
    code = f.read()

patch = """
  try {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN is_reminder INTEGER DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN attachments TEXT DEFAULT '[]';
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }
"""

code = code.replace(
'''  try {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN is_reminder INTEGER DEFAULT 0;
    `);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }''',
patch
)

with open("src/server.ts", "w") as f:
    f.write(code)
