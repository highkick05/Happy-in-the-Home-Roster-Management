import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const homeCareStartIndex = content.indexOf('  const calculateHomeCareTravel = async (shift: any) => {');
const homeCareMarker = "return { distance: 0, cost: 0, routeLogs: [] };\n    }\n  };";
const homeCareEndIndex = content.indexOf(homeCareMarker, homeCareStartIndex) + homeCareMarker.length;
if (homeCareStartIndex !== -1 && homeCareEndIndex > homeCareStartIndex) {
  content = content.substring(0, homeCareStartIndex) + content.substring(homeCareEndIndex);
}

const provStartIndex = content.indexOf('  const calculateProviderTravel = async (shift: any) => {');
const provMarker = "return { distance: 0, minutes: 0, unCappedMinutes: 0, cost: 0, routeLogs: [] };\n    }\n  };";
const provEndIndex = content.indexOf(provMarker, provStartIndex) + provMarker.length;
if (provStartIndex !== -1 && provEndIndex > provStartIndex) {
  content = content.substring(0, provStartIndex) + content.substring(provEndIndex);
}

// 2. Remove formatCoords at 3838
content = content.replace(
  "const formatCoords = (coords: any[]) => coords && coords.length === 2 ? `[${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}]` : '';",
  "// formatCoords imported"
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Refactor complete');
