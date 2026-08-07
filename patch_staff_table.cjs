const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

// Remove the Type column header for CONTRACTORS
content = content.replace(
  /\{activeTab === 'CONTRACTORS' && <th className="px-4 py-2 font-semibold">Type<\/th>\}/g,
  ""
);

// We need to also remove it from the row
content = content.replace(
  /<td className="px-4 py-2">\s*<div className="flex gap-2 items-center">\s*<span className="px-1.5 py-0.2 rounded text-\[10px\] uppercase font-bold tracking-wider bg-\[#1d1f23\] text-brand-teal border border-brand-teal\/20">\s*\{c\.contractor_type \|\| 'Clinical'\}\s*<\/span>\s*<\/div>\s*<\/td>/g,
  ""
);

// We should also remove the "Clinical / Maintenance" tabs
content = content.replace(
  /\{activeTab === 'CONTRACTORS' && \([\s\S]*?<\/button>\s*<\/button>\s*<\/>\s*\)\}/,
  ""
);

// Update contractors.filter to remove the tabs logic
content = content.replace(
  /contractors.filter\(c => staffTab === 'STAFF' \? c\.contractor_type === 'Clinical' : c\.contractor_type === 'Maintenance'\)\.map/g,
  "contractors.map"
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content);
