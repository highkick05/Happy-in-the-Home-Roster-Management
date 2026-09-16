const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const regex = /let expires = formDates\[stepId\]\?\.expires \|\| '';/;
// Need to find the SECOND match of this (or match within handleDateUpdate).
// Let's just use string replace with a very specific regex for handleDateUpdate.
const fnRegex = /const handleDateUpdate = async \(stepId: string, fileId: number\) => \{\s*let issued = formDates\[stepId\]\?\.issued \|\| '';\s*let expires = formDates\[stepId\]\?\.expires \|\| '';/;
const replacement = `const handleDateUpdate = async (stepId: string, fileId: number) => {
    let issued = formDates[stepId]?.issued || '';
    let expires = formDates[stepId]?.expires || '';
    
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

content = content.replace(fnRegex, replacement);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
