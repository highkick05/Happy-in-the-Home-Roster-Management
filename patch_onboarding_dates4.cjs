const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// Remove the early auto-calculation
const regex1 = /const currentStep = dynamicSteps\.find\(s => s\.id === stepId\);\s*if \(\!expires && currentStep\?\.requires_expiry\) \{[\s\S]*?expires = d\.toISOString\(\)\.split\('T'\)\[0\];\s*\}/;
content = content.replace(regex1, 'const currentStep = dynamicSteps.find(s => s.id === stepId);');

// Add the validation and THEN auto-calculation
const regex2 = /\/\/ VALIDATIONS & CALCULATIONS\s*const today = new Date\(\);/;
const replacement = `// VALIDATIONS & CALCULATIONS
    const today = new Date();

    if (currentStep?.requires_expiry === 1 && !issued && !expires) {
      setUploadError(prev => ({ ...prev, [stepId]: 'Please provide either an Issue Date or an Expiry Date.' }));
      return;
    }
    
    if (!expires && currentStep?.requires_expiry === 1 && issued) {
        const years = currentStep.expiry_years || 1;
        const d = new Date(issued);
        d.setFullYear(d.getFullYear() + years);
        expires = d.toISOString().split('T')[0];
    }`;

content = content.replace(regex2, replacement);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
