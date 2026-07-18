const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-3xl w-full"/g,
  'className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-6xl w-full"'
);

code = code.replace(
  /className="max-w-full max-h-\[70vh\] rounded-lg shadow-xl"/g,
  'className="max-w-full max-h-[85vh] rounded-lg shadow-xl object-contain"'
);

fs.writeFileSync(file, code);
console.log("Success");
