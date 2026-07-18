const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Header
code = code.replace(
  /className="flex items-center justify-between px-8 py-6 mb-2 border-b border-border-subtle bg-brand-navy"/g,
  'className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-brand-navy"'
);
code = code.replace(
  /className="text-2xl font-bold text-white flex items-center gap-3"/g,
  'className="text-lg font-bold text-white flex items-center gap-2"'
);
code = code.replace(
  /className="w-7 h-7 text-brand-teal"/g,
  'className="w-5 h-5 text-brand-teal"'
);
code = code.replace(
  /className="text-sm text-\[#8B949E\] mt-1"/g,
  'className="text-xs text-[#8B949E]"'
);

// Car Image & Button
code = code.replace(
  /className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal\/90 transition-colors h-fit"/g,
  'className="bg-brand-teal text-white px-3 py-1.5 rounded font-medium text-xs hover:bg-brand-teal/90 transition-colors h-fit"'
);
// Apply mix-blend-mode for transparency effect and increase size
code = code.replace(
  /className="h-\[52px\] w-auto rounded-md shadow-sm border border-border-subtle object-cover" \/>/g,
  'className="h-[60px] w-auto object-contain" style={{ mixBlendMode: "screen", filter: "contrast(1.2)" }} />'
);

// Filters container
code = code.replace(
  /className="p-8 pb-32 max-w-full overflow-x-auto space-y-6"/g,
  'className="p-3 pb-16 max-w-full overflow-x-auto space-y-3"'
);

// Filter selects
code = code.replace(
  /className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-\[#E6EDF3\]/g,
  'className="w-full bg-brand-navy border border-border-subtle rounded-md px-2 py-1 text-xs text-[#E6EDF3]'
);
// Replace other elements with 'text-sm' in filter row to 'text-xs'
code = code.replace(
  /text-xs font-semibold text-\[#8B949E\] uppercase tracking-wider/g,
  'text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider'
);
// Replace table headers
code = code.replace(
  /<thead className="text-xs text-\[#E6EDF3\] uppercase tracking-wider bg-zinc-800 border-b border-border-subtle font-bold">/g,
  '<thead className="text-[10px] text-[#E6EDF3] uppercase tracking-wider bg-zinc-800 border-b border-border-subtle font-bold">'
);
code = code.replace(
  /<th className="px-4 py-3/g,
  '<th className="px-2 py-1.5'
);
// Replace table cells
code = code.replace(
  /<td className="px-4 py-3/g,
  '<td className="px-2 py-1.5'
);
code = code.replace(
  /<td colSpan=\{14\} className="px-4 py-12/g,
  '<td colSpan={14} className="px-2 py-6'
);

// Pagination
code = code.replace(
  /className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-navy"/g,
  'className="flex items-center justify-between p-2 border-t border-border-subtle bg-brand-navy"'
);

// Table inputs
code = code.replace(
  /className="w-24 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs/g,
  'className="w-20 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0.5 text-[10px]'
);

code = code.replace(
  /className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs/g,
  'className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0.5 text-[10px]'
);

// Badges
code = code.replace(
  /text-\[10px\]/g,
  'text-[9px]'
);

fs.writeFileSync(file, code);
