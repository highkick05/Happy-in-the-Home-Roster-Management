const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

// Replace useState for isHistorical
code = code.replace(/const \[isHistorical, setIsHistorical\] = useState.*?;\n?/, 'const isHistorical = false;\n');

// Replace the historical shift toggle block
const toggleBlockRegex = /\{\(!initialData\?\.id \|\| isHistorical\) && \(\s*<>\s*<div className="flex items-center justify-between bg-\[#18181b\] p-3 rounded-lg border border-amber-500\/30">\s*<div>\s*<h4 className="text-\[13px\] font-semibold text-amber-500">Historical Shift Migration<\/h4>\s*<p className="text-\[11px\] text-zinc-400">Instantly complete shift & save manual data<\/p>\s*<\/div>[\s\S]*?<\/button>\s*<\/div>\s*\{isHistorical && \([\s\S]*?<\/textarea>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/>\s*\)\}/;

code = code.replace(toggleBlockRegex, '');

fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

// Now for AddHistoricalShiftModal.tsx
let histCode = fs.readFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', 'utf-8');

histCode = histCode.replace(/const \[isHistorical, setIsHistorical\] = useState.*?;\n?/, 'const isHistorical = true;\n');

// We need to keep the progress note block but remove the toggle and the condition.
// Actually it's easier to just do string replacement.
const histToggleRegex = /<div className="flex items-center justify-between bg-\[#18181b\] p-3 rounded-lg border border-amber-500\/30">\s*<div>\s*<h4 className="text-\[13px\] font-semibold text-amber-500">Historical Shift Migration<\/h4>\s*<p className="text-\[11px\] text-zinc-400">Instantly complete shift & save manual data<\/p>\s*<\/div>[\s\S]*?<\/button>\s*<\/div>/;

histCode = histCode.replace(histToggleRegex, '');

// Also change the title to Add Historical Shift
histCode = histCode.replace(/<h2 className="text-xl font-semibold text-white">Add Shift\(s\)<\/h2>/, '<h2 className="text-xl font-semibold text-white">Add Historical Shift(s)</h2>');

fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', histCode);

console.log("Updated both modals!");
