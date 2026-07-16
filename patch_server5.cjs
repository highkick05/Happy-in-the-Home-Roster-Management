const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `travelCategoryCell = "Provider Travel, Activity Based Transport";`;
const replace1 = `travelCategoryCell = "Provider Travel\\nActivity Based Transport";`;

content = content.replace(target1, replace1);

fs.writeFileSync(file, content);
console.log("Done patching formatRouteLog join character to newline for Excel");
