const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix OdometerPhotoIcon
code = code.replace(
  /<div className="relative group flex items-center justify-center z-10 hover:z-50">/g,
  '<div className="relative group/icon flex items-center justify-center z-10 hover:z-50">'
);
code = code.replace(
  /group-hover:block/g,
  'group-hover/icon:block'
);
// Make the popup preview smaller
code = code.replace(
  /className="max-h-\[40vh\] max-w-\[40vw\] object-contain rounded bg-black\/50"/g,
  'className="max-h-48 max-w-48 object-contain rounded bg-black/50"'
);

// 2. Fix PT & ABT
code = code.replace(
  /category = 'PT & ABT';/g,
  "category = 'Provider Travel & Activity Based Transport';"
);

// 3. Remove dollar calculations
code = code.replace(
  /PT: \{Number\(log.provider_travel_km\)\.toFixed\(3\)\} km \(\\\$\{Number\(log.provider_travel_cost \|\| 0\)\.toFixed\(2\)\}\)/g,
  'PT: {Number(log.provider_travel_km).toFixed(3)} km'
);
code = code.replace(
  /ABT: \{Number\(log.abt_km\)\.toFixed\(3\)\} km \(\\\$\{Number\(log.abt_cost \|\| 0\)\.toFixed\(2\)\}\)/g,
  'ABT: {Number(log.abt_km).toFixed(3)} km'
);
code = code.replace(
  /Total: \{\(\(Number\(log.provider_travel_km\) \|\| 0\) \+ \(Number\(log.abt_km\) \|\| 0\)\)\.toFixed\(3\)\} km \(\\\$\{\(\(Number\(log.provider_travel_cost\) \|\| 0\) \+ \(Number\(log.abt_cost\) \|\| 0\)\)\.toFixed\(2\)\}\)/g,
  'Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km'
);

code = code.replace(
  /PT: \{totalPTKm\.toFixed\(3\)\} km \(\\\$\{totalPTCost\.toFixed\(2\)\}\)/g,
  'PT: {totalPTKm.toFixed(3)} km'
);
code = code.replace(
  /ABT: \{totalABTKm\.toFixed\(3\)\} km \(\\\$\{totalABTCost\.toFixed\(2\)\}\)/g,
  'ABT: {totalABTKm.toFixed(3)} km'
);
code = code.replace(
  /Total: \{grandTotalKm\.toFixed\(3\)\} km \(\\\$\{grandTotalCost\.toFixed\(2\)\}\)/g,
  'Total: {grandTotalKm.toFixed(3)} km'
);


fs.writeFileSync(file, code);
