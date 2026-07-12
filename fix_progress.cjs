const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

code = code.replace(
  "setProgressNote(initialData?.progressNote || '');",
  `
      let pNote = initialData?.progressNote || '';
      let cleanNotes = initialData?.notes || '';
      if (!pNote && cleanNotes.includes('[HISTORICAL]')) {
         cleanNotes = cleanNotes.replace('[HISTORICAL]', '').trim();
         // If there's no original notes, then all of cleanNotes is the progressNote
         // But we don't know what was original notes. Let's just put it all in progressNote for now
         pNote = cleanNotes;
         cleanNotes = '';
      }
      setProgressNote(pNote);
      if (!initialData?.notes) {
          // preserve notes if there were any, but above we moved it to pNote
      }
  `
);

code = code.replace(
  "setNotes(initialData?.notes || '');",
  `setNotes(cleanNotes || initialData?.notes || '');`
);

fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
