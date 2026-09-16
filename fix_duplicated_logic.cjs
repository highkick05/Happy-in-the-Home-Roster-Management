const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// The duplicated block in uploadFileAndSave:
/*
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
    }
    const currentStep = dynamicSteps.find(s => s.id === stepId);
    
    // VALIDATIONS & CALCULATIONS
*/
content = content.replace(/const currentStep = dynamicSteps\.find\(s => s\.id === stepId\);\s*if \(currentStep\?\.requires_expiry === 1 && !issued && !expires\) \{\s*alert\('Please provide either an Issue Date or an Expiry Date\.'\);\s*return;\s*\}\s*if \(\!expires && currentStep\?\.requires_expiry === 1 && issued\) \{\s*const years = currentStep\.expiry_years \|\| 1;\s*const d = new Date\(issued\);\s*d\.setFullYear\(d\.getFullYear\(\) \+ years\);\s*expires = d\.toISOString\(\)\.split\('T'\)\[0\];\s*\}\s*const currentStep = dynamicSteps\.find\(s => s\.id === stepId\);/, 'const currentStep = dynamicSteps.find(s => s.id === stepId);');

fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
