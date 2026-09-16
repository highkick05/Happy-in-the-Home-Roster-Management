const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

content = content.replace(
  'interface Step {\n  id: string;\n  title: string;\n  description: string;\n  type: StepType;\n  links: { text: string; url: string }[];\n  optional?: boolean;\n}',
  'interface Step {\n  id: string;\n  title: string;\n  description: string;\n  type: StepType;\n  links: { text: string; url: string }[];\n  optional?: boolean;\n  requires_expiry?: number;\n  expiry_years?: number;\n}'
);

content = content.replace(
  'type: d.upload_required ? \'upload\' : \'confirm\',',
  'type: d.upload_required ? \'upload\' : \'confirm\',\n          requires_expiry: d.requires_expiry,\n          expiry_years: d.expiry_years || 1,'
);

// We need to auto-calculate the expiry date if expiry_years is present when they upload
// Actually, the server calculates it? No, the frontend sends formData date_expires.
// Let's modify the handleFileUpload in OnboardingView to auto-calculate date_expires if not set but expiry_years exists.

const handleFileMatch = content.match(/const handleFileUpload = async \(stepId: string, file: File\) => \{[\s\S]*?const expires = formDates\[stepId\]\?\.expires;/);

if (handleFileMatch) {
  const replacement = handleFileMatch[0] + `
    
    let finalExpires = expires;
    const currentStep = dynamicSteps.find(s => s.id === stepId);
    if (!finalExpires && currentStep?.requires_expiry) {
        const years = currentStep.expiry_years || 1;
        const d = new Date();
        d.setFullYear(d.getFullYear() + years);
        finalExpires = d.toISOString().split('T')[0];
    }
`;
  content = content.replace(
    /if \(expires\) formData\.append\('date_expires', expires\);/,
    "if (finalExpires) formData.append('date_expires', finalExpires);"
  );
  content = content.replace(handleFileMatch[0], replacement);
}

fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
