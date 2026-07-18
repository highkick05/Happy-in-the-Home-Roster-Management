const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');
const index = code.indexOf('</tbody></table></div></div></div>');
console.log('Index:', index);
