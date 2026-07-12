const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

// Add a column check for progress_note on shifts
const colCheck = `
  try {
    const shiftCols = db.pragma("table_info(shifts)") as any[];
    const hasProgressNote = shiftCols.some((c: any) => c.name === "progress_note");
    if (!hasProgressNote) {
      db.exec("ALTER TABLE shifts ADD COLUMN progress_note TEXT");
      console.log("[DEBUG] Completed shifts.progress_note column check.");
    }
  } catch (e: any) {
    console.warn("Migration warning for shifts.progress_note:", e.message);
  }
`;

// Insert the colCheck around line 368 where I add services_json to invoices
code = code.replace(
  'console.log("[DEBUG] Completed invoices.services_json column check.");',
  'console.log("[DEBUG] Completed invoices.services_json column check.");' + colCheck
);

fs.writeFileSync('src/server.ts', code);
