const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Swap button and car image, add padding
code = code.replace(
  /<div className="flex items-center gap-3 relative">\s*<button[\s\S]*?<\/button>\s*<img src=\{carImage\}[\s\S]*?\/>\s*<\/div>/g,
  `<div className="flex items-center gap-6 relative">
          <img src={carImage} alt="Luxury Vehicle" className="h-[60px] w-auto object-contain pointer-events-none" style={{ mixBlendMode: "screen", filter: "contrast(1.2) brightness(1.2)" }} />
          <button 
            onClick={() => setShowVehicles(true)}
            className="bg-brand-teal text-white px-3 py-1.5 rounded font-medium text-xs hover:bg-brand-teal/90 transition-colors h-fit whitespace-nowrap"
          >
            Vehicle Register
          </button>
        </div>`
);

// 2. Category badge width
code = code.replace(
  /<div className="flex flex-col gap-1 w-fit">/g,
  '<div className="flex flex-col items-start gap-1 w-fit">'
);

// 3. New Column for Shift Times
code = code.replace(
  /<th className="px-2 py-1\.5 border-r border-border-subtle\/30">Service Date<\/th>/g,
  '<th className="px-2 py-1.5 border-r border-border-subtle/30">Service Date</th>\n                  <th className="px-2 py-1.5 border-r border-border-subtle/30">Shift Times</th>'
);

// Time formatter
if (!code.includes('getLocalizedTimeString')) {
  code = code.replace(
    /const getLocalizedDateString = \(dt: string\) => \{/g,
    `const getLocalizedTimeString = (dt: string) => {
    if (!dt) return '';
    return format(new Date(dt), 'h:mm a');
  };
  const getLocalizedDateString = (dt: string) => {`
  );
}

// Table cell
code = code.replace(
  /<td className="px-2 py-1\.5 border-r border-border-subtle\/30 whitespace-nowrap">\{getLocalizedDateString\(log\.start_time\)\}<\/td>/g,
  `<td className="px-2 py-1.5 border-r border-border-subtle/30 whitespace-nowrap">{getLocalizedDateString(log.start_time)}</td>
                        <td className="px-2 py-1.5 border-r border-border-subtle/30 whitespace-nowrap text-xs text-[#8B949E]">{getLocalizedTimeString(log.start_time)} - {getLocalizedTimeString(log.end_time)}</td>`
);

// Add 1 to colSpan since we added a new column
code = code.replace(
  /<td colSpan=\{14\} className="px-2 py-6 text-center text-\[#8B949E\]">/g,
  '<td colSpan={15} className="px-2 py-6 text-center text-[#8B949E]">'
);

fs.writeFileSync(file, code);
