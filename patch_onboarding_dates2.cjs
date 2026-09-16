const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const regex = /const d = new Date\(\);\s*d\.setFullYear\(d\.getFullYear\(\) \+ years\);\s*finalExpires = d\.toISOString\(\)\.split\('T'\)\[0\];/;
const replacement = `const d = issued ? new Date(issued) : new Date();
        d.setFullYear(d.getFullYear() + years);
        finalExpires = d.toISOString().split('T')[0];`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
