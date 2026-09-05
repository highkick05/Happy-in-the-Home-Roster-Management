const { execSync } = require('child_process');
execSync("npx tsc src/quotePdf.ts --noEmit --esModuleInterop");
console.log("TS check passed for quotePdf.ts");
