const fs = require('fs');
const file = 'tsconfig.json';
let config = JSON.parse(fs.readFileSync(file, 'utf8'));

config.compilerOptions.esModuleInterop = true;
config.compilerOptions.downlevelIteration = true;

fs.writeFileSync(file, JSON.stringify(config, null, 2));
