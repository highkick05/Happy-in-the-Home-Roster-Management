import re

with open("src/server.ts", "r") as f:
    code = f.read()

# We need to fix the misplaced catch block for is_historical.
# Currently it looks like:
#  try {
#    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");
#  try {

# We will replace:
#  try {
#    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");
#  try {
# with:
#  try {
#    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");
#  } catch (e: any) {
#    if (e.message && !e.message.includes("duplicate column")) console.warn(e.message);
#  }
#  try {

# AND we need to remove the dangling closing part around line 521.
# It looks like:
#    console.log("[DEBUG] Completed is_historical column check.");
#  } catch (e: any) {
#    if (e.message && !e.message.includes("duplicate column")) {
#      console.warn("Migration warning:", e.message);
#    }
#  }

def fix_code(c):
    c = c.replace('''  try {
    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");

  try {''', '''  try {
    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");
    console.log("[DEBUG] Completed is_historical column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {''')
    
    c = c.replace('''  } catch (e: any) {
    console.warn("Migration warning for settings table:", e.message);
  }
    
    console.log("[DEBUG] Completed is_historical column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }''', '''  } catch (e: any) {
    console.warn("Migration warning for settings table:", e.message);
  }''')
    return c

code = fix_code(code)

with open("src/server.ts", "w") as f:
    f.write(code)
