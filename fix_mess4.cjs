const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const tfootIndex = code.indexOf('<tfoot className="bg-brand-navy border-t-2 border-border-subtle font-semibold">');
console.log('tfoot found:', tfootIndex !== -1);

// Let's just fix the mismatched divs by using a simpler approach. 
// I will output the file to see the structure.
