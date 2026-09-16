const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const regex = /let expires = formDates\[stepId\]\?\.expires \|\| '';/;
const replacement = `let expires = formDates[stepId]?.expires || '';
    const currentStep = dynamicSteps.find(s => s.id === stepId);
    if (!expires && currentStep?.requires_expiry) {
        const years = currentStep.expiry_years || 1;
        const d = issued ? new Date(issued) : new Date();
        d.setFullYear(d.getFullYear() + years);
        expires = d.toISOString().split('T')[0];
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
