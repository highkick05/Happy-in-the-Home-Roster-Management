const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const regex = /let expires = formDates\[stepId\]\?\.expires \|\| '';/;
const replacement = `let expires = formDates[stepId]?.expires || '';
    
    const currentStep = dynamicSteps.find(s => s.id === stepId);
    
    if (currentStep?.requires_expiry === 1 && !issued && !expires) {
      alert('Please provide either an Issue Date or an Expiry Date.');
      return;
    }
    
    if (!expires && currentStep?.requires_expiry === 1 && issued) {
        const years = currentStep.expiry_years || 1;
        const d = new Date(issued);
        d.setFullYear(d.getFullYear() + years);
        expires = d.toISOString().split('T')[0];
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
