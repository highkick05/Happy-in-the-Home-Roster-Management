const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/log\.services_json/g, 'log.transport_route_log');
fs.writeFileSync(file, code);
console.log('Fixed transport_route_log');
