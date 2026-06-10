const fs = require('fs');
const path = require('path');

const dir = 'src/components/Settings';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content
    // Outer/Inner
    .replace(/p-8 /g, 'p-4 ')
    .replace(/p-8"/g, 'p-4"')
    .replace(/p-6 /g, 'p-4 ')
    .replace(/p-6"/g, 'p-4"')
    .replace(/space-y-6/g, 'space-y-3')
    .replace(/space-y-8/g, 'space-y-4')
    .replace(/mb-6 md:mb-0/g, 'mb-2 md:mb-0')
    .replace(/mb-8"/g, 'mb-4"')
    
    // Sub-tab Navigation && Button Compression
    .replace(/px-4 py-2/g, 'px-3 py-1.5')
    .replace(/px-4 py-2.5/g, 'px-3 py-1.5')
    //.replace(/text-\[13px\]/g, 'text-xs')
    
    // Table Refactors
    .replace(/px-4 py-4/g, 'px-3 py-2')
    .replace(/px-4 py-3/g, 'px-3 py-1.5')
    
    // Inputs/Selects
    .replace(/py-2 text-\[13px\]/g, 'py-1.5 text-xs')
    .replace(/py-2 text-sm/g, 'py-1.5 text-xs')
    .replace(/px-2 py-1\.5/g, 'px-2 py-1 text-xs')
    .replace(/px-3 py-2 text-sm/g, 'px-3 py-1.5 text-xs')
    .replace(/px-3 py-1\.5 text-sm/g, 'px-3 py-1.5 text-xs')
    .replace(/text-sm font-medium text-\[#8B949E\]/g, 'text-xs font-medium text-[#8B949E]')
    .replace(/text-\[12px\] font-medium text-\[#8B949E\]/g, 'text-xs font-medium text-[#8B949E]')
    .replace(/h-10/g, 'h-8');

  // Some specific tight fixes
  content = content
    .replace(/<th className="px-3 py-2 font-semibold">/g, '<th className="px-3 py-2 font-semibold text-xs uppercase">')
  
  fs.writeFileSync(filePath, content);
}
