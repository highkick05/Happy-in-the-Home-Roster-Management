const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// In `handleFileSave`:
const handleFileSaveRegex = /const generalSteps = ONBOARDING_STEPS\.filter\([\s\S]*?return s\.id === 'ndis_screening' \|\| s\.id === 'ndis_orientation';\n\s*\}\);/g;
content = content.replace(handleFileSaveRegex, '');

// In the main render block:
const renderRegex = /const generalSteps = ONBOARDING_STEPS\.filter\([\s\S]*?return s\.id === 'ndis_screening' \|\| s\.id === 'ndis_orientation';\n\s*\}\);/g;
content = content.replace(renderRegex, '');

// Rendering logic
content = content.replace(/\{generalSteps\.map\(\(step, index\) => renderStepCard\(step, index \+ 1\)\)\}/, '{dynamicSteps.map((step, index) => renderStepCard(step, index + 1))}');

fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content, 'utf8');
console.log("Patched generalSteps out of OnboardingView.tsx");
