const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /let serviceNamesList: string\[\] = \[\];\s*if\s*\(servicesArray\.length > 0\)\s*\{\s*for\s*\(const sData of servicesArray\)\s*\{/;

const replacement = `let serviceNamesList: string[] = [];
          let hasProviderTravelService = false;
          let hasABTService = false;

          if (servicesArray.length > 0) {
            for (const sData of servicesArray) {`;

if(code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/server.ts', code);
    console.log("Replaced serviceNamesList part");
} else {
    console.log("Could not match serviceNamesList part");
}
