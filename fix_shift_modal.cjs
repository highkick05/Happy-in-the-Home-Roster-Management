const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

// Replace the line `setIsHistorical(isHistCheck);`
code = code.replace(/setIsHistorical\(isHistCheck\);/g, '');

// The toggle block was matched by regex but maybe not all of it. Let's do it simply by strings.
const blockStart = `{(!initialData?.id || isHistorical) && (`;
const blockEnd = `)}`;

// actually, let's just use sed or regex again properly.
code = code.replace(/<div className="flex items-center justify-between bg-\[#18181b\] p-3 rounded-lg border border-amber-500\/30">[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
console.log("Fixed AddShiftModal!");
