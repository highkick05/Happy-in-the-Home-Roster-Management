const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// 1. Remove ONBOARDING_STEPS array
const regex = /export const ONBOARDING_STEPS: Step\[\] = \[\s*[\s\S]*?\}\n\];/;
content = content.replace(regex, '');

// 2. Remove references to generalSteps, ndisSteps, ONBOARDING_STEPS, etc.
// Look for where generalSteps and ndisSteps are defined in the component.
const filterRegex = /const generalSteps = ONBOARDING_STEPS\.filter\(s => !ndisSpecificIds\.includes\(s\.id\)\);\n\s*const ndisSteps = ONBOARDING_STEPS\.filter\(s => ndisSpecificIds\.includes\(s\.id\)\);/;
content = content.replace(filterRegex, '');

// The dynamicSteps are what we will render.
content = content.replace(/\[\.\.\.ONBOARDING_STEPS, \.\.\.dynamicSteps\]/g, 'dynamicSteps');

// In visibleSteps computation:
content = content.replace(/const visibleSteps = ndisRelated \? \[\.\.\.generalSteps, \.\.\.ndisSteps, \.\.\.dynamicSteps\] : \[\.\.\.generalSteps, \.\.\.dynamicSteps\];/, 'const visibleSteps = dynamicSteps;');
content = content.replace(/const activeList = ndisRelated \? \[\.\.\.generalSteps, \.\.\.ndisSteps, \.\.\.dynamicSteps\] : \[\.\.\.generalSteps, \.\.\.dynamicSteps\];/, 'const activeList = dynamicSteps;');


// Remove NDIS prompt because it's no longer applicable if we rely solely on dynamic steps?
// Wait, the user said "completely remove the old Onboarding hub in the staff users portals to use the new Onboarding implementation"
// Let's remove the NDIS alert box if we can. 
content = content.replace(/<div className="bg-brand-navy border border-border-subtle rounded-xl p-6 mb-6">[\s\S]*?<\/div>/m, '');


fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content, 'utf8');
console.log("Patched OnboardingView.tsx");
