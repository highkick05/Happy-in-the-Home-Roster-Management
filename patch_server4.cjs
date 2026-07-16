const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `              return out.join(' ; ') || logStr;`;
const replace1 = `              return out.join('\\n') || logStr;`;

// wait, the formatRouteLog might be returning ` ; ` or `\n`. In Excel `\n` is better.
content = content.replace(target1, replace1);

const target2 = `travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;`;
// Since the fullRoute has \`\\n\`, we just let it be. But wait, we have 4 instances of travelRouteCell assignment.

content = content.replace(/formatRouteLog\(s\.transport_route_log, s\) \|\| "-"/g, "formatRouteLog(s.transport_route_log, s)");

fs.writeFileSync(file, content);
console.log("Done patching formatRouteLog join character to newline for Excel");
