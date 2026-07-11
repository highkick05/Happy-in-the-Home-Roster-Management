const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target1 = `      const actualNotes = isHist ? (notes ? notes + ' [HISTORICAL]' : '[HISTORICAL]') : notes;
      
      const insertHistoricalData = (shiftId, single) => {
        if (!isHist) return;
        const now = new Date().toISOString();
        if (progress_note) {
          db.prepare("INSERT INTO progress_notes (shift_id, note_text, created_by, is_admin_note, is_incident) VALUES (?, ?, ?, 0, 0)")
            .run(shiftId, progress_note, req.user?.id || 1);
        }`;

const replace1 = `      let actualNotes = notes || "";
      if (isHist) {
          if (progress_note) actualNotes += (actualNotes ? "\\n" : "") + progress_note;
          actualNotes += (actualNotes ? " " : "") + "[HISTORICAL]";
      } else {
          actualNotes = notes;
      }
      
      const insertHistoricalData = (shiftId, single) => {
        if (!isHist) return;
        const now = new Date().toISOString();`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    fs.writeFileSync('src/server.ts', code);
    console.log("Success replacing progress_notes block");
} else {
    console.log("Could not find progress_notes block");
}
