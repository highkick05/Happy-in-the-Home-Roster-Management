const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const matches = content.match(/<tr key=\{row\.id.*?\n.*?\n.*?\n.*?\n.*?<\/tr>/gs);
if (matches) {
    matches.forEach(m => console.log(m + "\n---\n"));
} else {
    console.log("No tr match");
}
