const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-brand-navy">[\s\S]*?<\/div>\s*<div className="flex items-center gap-4">/g,
  `<div className="flex items-center justify-between px-3 py-1 border-b border-border-subtle bg-brand-navy">
        <h1 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-teal" />
            Travel Logs
        </h1>
        <div className="flex items-center gap-3">`
);

code = code.replace(
  /className="p-3 pb-16 max-w-full overflow-x-auto space-y-3"/g,
  'className="p-2 pb-16 max-w-full overflow-x-auto space-y-2"'
);

fs.writeFileSync(file, code);
