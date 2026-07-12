const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', 'utf-8');

const regex = /(\{isHistorical && \(\s*<div className="space-y-3 p-3 bg-amber-500\/5 rounded-lg border border-amber-500\/20">[\s\S]*?<\/div>\s*\)\})/g;
let match = regex.exec(code);

if (match) {
    const historicalBlock = match[0];
    
    // Remove from top
    code = code.replace(historicalBlock, '');
    
    // Find the insertion point (after the Notes field)
    const notesRegex = /(<div>\s*<label className="block text-\[12px\] font-medium text-zinc-400 mb-1\.5">Notes<\/label>\s*<textarea[\s\S]*?<\/textarea>\s*<\/div>)/;
    
    let notesMatch = notesRegex.exec(code);
    if (notesMatch) {
        const notesBlock = notesMatch[0];
        code = code.replace(notesBlock, notesBlock + '\n\n              ' + historicalBlock);
        
        fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', code);
        console.log("Moved historical block!");
    } else {
        console.log("Could not find notes block!");
        // let's try a different regex
        const fallbackRegex = /(placeholder="Optional notes for shift\.\.\."\s*\/>\s*<\/div>)/;
        let fbMatch = fallbackRegex.exec(code);
        if (fbMatch) {
            code = code.replace(fbMatch[0], fbMatch[0] + '\n\n              ' + historicalBlock);
            fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', code);
            console.log("Moved historical block (fallback)!");
        } else {
             console.log("Could not find notes block either!");
        }
    }
} else {
    console.log("Could not find historical block!");
}
