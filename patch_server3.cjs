const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `          // Alternating row styling`;
const replace1 = `          row.getCell('claimableTravel').alignment = { wrapText: true, vertical: 'top' };
          row.getCell('travelRoute').alignment = { wrapText: true, vertical: 'top' };
          row.getCell('travelCategory').alignment = { wrapText: true, vertical: 'top' };
          // Alternating row styling`;

content = content.replace(target1, replace1);
fs.writeFileSync(file, content);
console.log("Done patching wrap text");
