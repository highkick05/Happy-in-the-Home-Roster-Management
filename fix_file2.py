import re

with open("src/server.ts", "r") as f:
    code = f.read()

bad_block = """  try {
    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");

  try {"""

good_block = """  try {
    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");
    console.log("[DEBUG] Completed is_historical column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {"""

code = code.replace(bad_block, good_block)

with open("src/server.ts", "w") as f:
    f.write(code)
