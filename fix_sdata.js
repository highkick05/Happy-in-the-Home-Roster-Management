const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// For line 6247-6269 (inside `if (tmpl.services_json)`)
code = code.replace(/servicesData\[0\]\.rateOverride = Number\(rates\[region\]\);/g, (match, offset) => {
    // If it's inside `if (tmpl.services_json)`, it's a loop over `sData`.
    // Wait, the simplest way is to write a regex to replace `servicesData[0]` back to `sData` ONLY inside loops.
    return match;
});
