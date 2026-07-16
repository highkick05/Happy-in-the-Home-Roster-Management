import re

with open("src/server.ts", "r") as f:
    code = f.read()

good = """  try {
    db.exec("ALTER TABLE invoices ADD COLUMN merged_into_invoice_id INTEGER");
    console.log(
      "[DEBUG] Completed invoices.merged_into_invoice_id column check.",
    );
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec("ALTER TABLE invoices ADD COLUMN merged_into_shift_id INTEGER");
    console.log("[DEBUG] Completed invoices.merged_into_shift_id column check.");
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) console.warn("Migration warning:", e.message);
  }"""

code = re.sub(r'  try \{\n    db\.exec\("ALTER TABLE invoices ADD COLUMN merged_into_invoice_id INTEGER"\);\n    console\.log\(\n      "\[DEBUG\] Completed invoices\.merged_into_invoice_id column check\.",\n    \);\n  \} catch \(e: any\) \{\n    if \(e\.message && !e\.message\.includes\("duplicate column"\)\) \{\n      console\.warn\("Migration warning:", e\.message\);\n    \}\n  \}', good, code)

with open("src/server.ts", "w") as f:
    f.write(code)
