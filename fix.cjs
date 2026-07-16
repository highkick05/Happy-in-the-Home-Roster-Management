const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

// The duplicate cell logic is between line 630 and 733 approximately.
// Let's just find the duplicate code blocks.
const cellLogicMatch = content.match(/const pt_km = row\.provider_travel_km \|\| 0;[\s\S]+?let claimableTravelCell = [^;]+;[\s\S]+?} else if \(hasABT\) {[\s\S]+?}/);

if (cellLogicMatch) {
    const cellLogic = cellLogicMatch[0];
    
    // If it exists twice in close proximity, we can find it and remove one.
    // Actually, let's just find the exact duplicate block we injected.
    const duplicateInjection = `\n${cellLogic}\n                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';\n                         let noteStatusStr = 'Missing';`;
    
    // We replaced `let noteBadgeCls = 'bg-slate-500/10...; let noteStatusStr = 'Missing';` with the above.
    // So if we replace `duplicateInjection` back with `let noteBadgeCls = ...` we will undo the bad injection.
    const firstOccur = content.indexOf(duplicateInjection);
    if (firstOccur !== -1) {
        content = content.replace(duplicateInjection, `let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';\n                         let noteStatusStr = 'Missing';`);
        
        // NOW we need to inject it into the right place for staffMatrix.
        // We know staffMatrix has `const km = p_km + hc_km + (row.abt_km || 0);` right above `let noteBadgeCls`
        // Let's find that exact string
        const staffLocation = /const km = p_km \+ hc_km \+ \(row\.abt_km \|\| 0\);\s*let noteBadgeCls = 'bg-slate-500\/10 border-slate-500\/20 text-slate-400';\s*let noteStatusStr = 'Missing';/;
        if (content.match(staffLocation)) {
            content = content.replace(staffLocation, `const km = p_km + hc_km + (row.abt_km || 0);\n                        ${cellLogic}\n                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';\n                         let noteStatusStr = 'Missing';`);
        } else {
            console.log("staffLocation not found");
        }

        fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
        console.log("Fixed!");
    } else {
        console.log("duplicate injection not found");
    }
}
