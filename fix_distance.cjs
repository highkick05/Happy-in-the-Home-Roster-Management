const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/parsed\.providerTravel\.distanceValue/g, 'parsed.providerTravel.distance');
code = code.replace(/parsed\.abt\.distanceValue/g, 'parsed.abt.distance');

fs.writeFileSync(file, code);
