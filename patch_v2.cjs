const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Header sizing
code = code.replace(
  /<div className="flex items-center justify-between px-3 py-1 border-b border-border-subtle bg-brand-navy">/g,
  '<div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle bg-brand-navy overflow-hidden">'
);
code = code.replace(
  /<h1 className="text-base font-bold text-white flex items-center gap-2">/g,
  '<h1 className="text-xl font-bold text-white flex items-center gap-2">'
);
code = code.replace(
  /<FileText className="w-4 h-4 text-brand-teal" \/>/g,
  '<FileText className="w-5 h-5 text-brand-teal" />'
);

// 2. Button and Car image
code = code.replace(
  /className="bg-brand-teal text-white px-3 py-1\.5 rounded font-medium text-xs hover:bg-brand-teal\/90 transition-colors h-fit relative z-10 mr-\[120px\]"/g,
  'className="bg-brand-teal text-white px-3 py-1.5 rounded font-medium text-xs hover:bg-brand-teal/90 transition-colors h-fit relative z-10 mr-[100px]"'
);

code = code.replace(
  /<img src=\{carImage\} alt="Luxury Vehicle" className="h-\[80px\] w-auto object-contain absolute right-\[-10px\] top-1\/2 -translate-y-1\/2 pointer-events-none" style=\{\{ mixBlendMode: "screen", filter: "contrast\(1\.2\) brightness\(1\.2\)", transform: "translateY\(-50%\) scale\(1\.4\)", transformOrigin: "right center" \}\} \/>/g,
  '<img src={carImage} alt="Luxury Vehicle" className="h-[60px] w-auto object-contain absolute right-[-5px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ mixBlendMode: "screen", filter: "contrast(1.2) brightness(1.2)" }} />'
);

// 3. Columns alignment and font size
// "Start Odometer"
code = code.replace(
  /<th className="px-2 py-1\.5 border-r border-border-subtle\/30">Start Odometer<\/th>/g,
  '<th className="px-2 py-1.5 border-r border-border-subtle/30 text-center">Start Odometer</th>'
);
// "End Odometer"
code = code.replace(
  /<th className="px-2 py-1\.5 border-r border-border-subtle\/30">End Odometer<\/th>/g,
  '<th className="px-2 py-1.5 border-r border-border-subtle/30 text-center">End Odometer</th>'
);
// "Vehicle"
code = code.replace(
  /<th className="px-2 py-1\.5 border-r border-border-subtle\/30">Vehicle<\/th>/g,
  '<th className="px-2 py-1.5 border-r border-border-subtle/30 text-center">Vehicle</th>'
);

// Cell alignments
code = code.replace(
  /<td className="px-2 py-1\.5 border-r border-border-subtle\/30 whitespace-nowrap">\s*<div className="flex items-center gap-2">/g,
  '<td className="px-2 py-1.5 border-r border-border-subtle/30 whitespace-nowrap text-center">\n                          <div className="flex items-center justify-center gap-2">'
);
code = code.replace(
  /<td className="px-2 py-1\.5 whitespace-nowrap">\s*<select/g,
  '<td className="px-2 py-1.5 whitespace-nowrap text-center">\n                          <select'
);

// Inputs text size
code = code.replace(
  /className="w-20 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0\.5 text-\[9px\] transition-colors"/g,
  'className="w-20 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0.5 text-xs text-center transition-colors"'
);
code = code.replace(
  /className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0\.5 text-\[9px\] transition-colors"/g,
  'className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-1 py-0.5 text-xs text-center transition-colors"'
);

fs.writeFileSync(file, code);
