const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

const ndisBlockStart = '        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6 shadow-lg my-8">';
const ndisBlockEnd = '{ndisSteps.map((step, index) => renderStepCard(step, generalSteps.length + index + 1))}\n          </div>\n        )}';

const startIdx = content.indexOf(ndisBlockStart);
const endIdx = content.indexOf(ndisBlockEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx + ndisBlockEnd.length);
  fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content, 'utf8');
  console.log("Removed NDIS rendering block");
} else {
  console.log("Could not find NDIS rendering block");
}
