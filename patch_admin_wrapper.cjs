const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="min-h-screen bg-[#0A0A0A] p-6 lg:p-8">',
  '<div className="flex-1 overflow-auto bg-black p-4 md:p-6">'
);

content = content.replace(
  '<div className="max-w-6xl mx-auto">',
  '<div className="max-w-6xl mx-auto space-y-4">'
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched wrapper');
