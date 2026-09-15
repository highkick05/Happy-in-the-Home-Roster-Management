const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// Remove the ndisRelated state and toggle logic
content = content.replace(/const \[ndisRelated, setNdisRelated\] = useState<boolean>\(\(\) => \{[\s\S]*?\}\);/, '');
content = content.replace(/const handleNdisToggle = \(val: boolean\) => \{[\s\S]*?\}\;/m, '');
content = content.replace(/const ndisSpecificIds = \['ndis_screening', 'ndis_orientation'\];/, '');

// Find any remaining ndis alerts
content = content.replace(/<div className="bg-brand-navy border border-border-subtle rounded-xl p-6 mb-6">[\s\S]*?<\/div>/m, '');

fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content, 'utf8');
console.log("Patched ndis out of OnboardingView.tsx");
