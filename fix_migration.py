import re

with open('src/server.ts', 'r') as f:
    text = f.read()

target = """  try {
    db.exec("ALTER TABLE shifts ADD COLUMN custom_staff_name TEXT");
    try { db.exec("ALTER TABLE shifts ADD COLUMN tags TEXT"); } catch (e) {}
    console.log("[DEBUG] Completed custom_staff_name column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }"""

replacement = """  try {
    db.exec("ALTER TABLE shifts ADD COLUMN custom_staff_name TEXT");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }
  try {
    db.exec("ALTER TABLE shifts ADD COLUMN tags TEXT");
  } catch (e: any) {}"""

text = text.replace(target, replacement)

with open('src/server.ts', 'w') as f:
    f.write(text)
