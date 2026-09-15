const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const regex = /const \[sessionUploadedFiles, setSessionUploadedFiles\] = useState<Record<string, boolean>>\(\{\}\);/;
content = content.replace(regex, "const [sessionUploadedFiles, setSessionUploadedFiles] = useState<Record<string, boolean>>({});\n  const [dynamicSteps, setDynamicSteps] = useState<Step[]>([]);");

fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content, 'utf8');
console.log("Patched state into OnboardingView");
