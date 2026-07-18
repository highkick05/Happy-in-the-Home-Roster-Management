const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<div className="flex items-center gap-3">\s*<button/g,
  `<div className="flex items-center gap-3 relative">
          <button`
);

code = code.replace(
  /<img src=\{carImage\} alt="Luxury Vehicle" className="h-\[60px\] w-auto object-contain" style=\{\{ mixBlendMode: "screen", filter: "contrast\(1\.2\) brightness\(1\.1\)" \}\} \/>/g,
  '<img src={carImage} alt="Luxury Vehicle" className="h-[80px] w-auto object-contain absolute right-[-10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ mixBlendMode: "screen", filter: "contrast(1.2) brightness(1.2)", transform: "translateY(-50%) scale(1.4)", transformOrigin: "right center" }} />'
);

// Wait, the button needs to have a z-index and margin-right so the car doesn't block it, 
// though the car is pointer-events-none.
code = code.replace(
  /className="bg-brand-teal text-white px-3 py-1\.5 rounded font-medium text-xs hover:bg-brand-teal\/90 transition-colors h-fit"/g,
  'className="bg-brand-teal text-white px-3 py-1.5 rounded font-medium text-xs hover:bg-brand-teal/90 transition-colors h-fit relative z-10 mr-[120px]"'
);

fs.writeFileSync(file, code);
