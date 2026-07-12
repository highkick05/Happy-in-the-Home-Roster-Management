const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

const regex = /setStartDate\(startD\);[\s\S]*?setProgressNote\(pNote\);[\s\S]*?if \(!initialData\?\.notes\) \{[\s\S]*?\}/m;

const replacement = `setStartDate(startD);
      setEndDate(endD);
      setStartTime(startT);
      setEndTime(endT);
      
      let pNote = initialData?.progressNote || '';
      let cNotes = initialData?.notes || '';
      const isHistCheck = !!initialData?.isHistorical || (initialData?.status === 'COMPLETED' && cNotes.includes('[HISTORICAL]'));
      setIsHistorical(isHistCheck);
      
      if (!pNote && cNotes.includes('[HISTORICAL]')) {
         cNotes = cNotes.replace('[HISTORICAL]', '').trim();
         pNote = cNotes;
         cNotes = '';
      }
      
      setNotes(cNotes);
      setProgressNote(pNote);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
