const fs = require('fs');
console.log(fs.readFileSync('src/services/travelEngine.ts', 'utf-8').includes('is_historical'));
