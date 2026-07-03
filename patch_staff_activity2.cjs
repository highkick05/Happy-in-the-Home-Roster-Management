const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const nameLower = srv\.name\.toLowerCase\(\);\s*\/\/\s*Do not list Provider Travel or ABT here; they get their own dedicated rows\s*if\s*\(\s*!nameLower\.includes\("provider travel"\) &&\s*!nameLower\.includes\("activity based transport"\)\s*\)\s*\{/;

const replacement = `const nameLower = srv.name.toLowerCase();
                if (nameLower.includes("provider travel")) {
                  hasProviderTravelService = true;
                }
                if (nameLower.includes("activity based transport")) {
                  hasABTService = true;
                }
                // Do not list Provider Travel or ABT here; they get their own dedicated rows
                if (
                  !nameLower.includes("provider travel") &&
                  !nameLower.includes("activity based transport")
                ) {`;

if(code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/server.ts', code);
    console.log("Replaced if conditions part");
} else {
    console.log("Could not match if conditions part");
}
