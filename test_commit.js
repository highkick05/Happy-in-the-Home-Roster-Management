const { execSync } = require('child_process');
console.log(execSync('git rev-parse --short HEAD').toString().trim());
