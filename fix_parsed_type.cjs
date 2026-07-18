const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

if (code.includes('let parsed = {};')) {
  code = code.replace('let parsed = {};', 'let parsed: any = {};');
  fs.writeFileSync(file, code);
  console.log('Fixed parsed type');
}
