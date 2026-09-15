const fs = require('fs');
const file = 'src/components/Onboarding/OnboardingView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Reduce main container max width slightly to feel more compact on desktop
content = content.replace(
  /<div className="max-w-4xl mx-auto space-y-6">/,
  '<div className="max-w-4xl mx-auto space-y-4">'
);

// Reduce top header bottom margin
content = content.replace(
  /<div className="mb-6 flex flex-col gap-1 border-b border-white\/\[0\.05\] pb-4">/,
  '<div className="mb-4 flex flex-col gap-0.5 border-b border-white/[0.05] pb-3">'
);

// Reduce progress container bottom margin
content = content.replace(
  /className="bg-\[#111111\] border border-white\/\[0\.05\] rounded-lg p-4 shadow-sm relative overflow-hidden mb-6"/,
  'className="bg-[#111111] border border-white/[0.05] rounded-lg p-3 shadow-sm relative overflow-hidden mb-4"'
);

// Reduce spacing between step cards
content = content.replace(
  /<div className="space-y-4">/g,
  '<div className="space-y-2">'
);

// Reduce step card padding
content = content.replace(
  /className="p-3 md:p-4 flex items-center justify-between cursor-pointer select-none"/g,
  'className="px-3 py-2.5 flex items-center justify-between cursor-pointer select-none"'
);

content = content.replace(
  /<div className="flex items-center gap-4 text-white">/g,
  '<div className="flex items-center gap-3 text-white">'
);

// Reduce important note margin
content = content.replace(
  /mt-6">/g,
  'mt-4">'
);
content = content.replace(
  /<div className="bg-amber-500\/10 border border-amber-500\/20 rounded-lg p-4 flex items-start gap-3 mt-4">/g,
  '<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2.5 mt-4">'
);
content = content.replace(
  /<div className="w-8 h-8 rounded-full bg-amber-500\/20 text-amber-500 flex items-center justify-center shrink-0">/,
  '<div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">'
);
content = content.replace(
  /<span className="font-bold text-lg">!<\/span>/,
  '<span className="font-bold text-sm">!</span>'
);


fs.writeFileSync(file, content, 'utf8');
console.log('Extra padding reduced');
