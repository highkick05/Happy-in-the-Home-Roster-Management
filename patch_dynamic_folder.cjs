const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const oldCode = `                if (req.query.context === "STAFF_ONBOARDING") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Onboarding\`;
                } else if (req.query.context === "STAFF_VEHICLES") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Vehicles\`;
                }`;
const newCode = `                if (req.query.context === "STAFF_ONBOARDING") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Onboarding\`;
                } else if (req.query.context === "STAFF_VEHICLES") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Vehicles\`;
                } else if (req.query.context === "STAFF_TRAINING") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Training\`;
                }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched resolveDynamicFolder!");
} else {
    console.log("Could not find dynamic folder block!");
}
