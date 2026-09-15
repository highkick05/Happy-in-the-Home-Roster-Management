const fs = require('fs');
const file = 'src/components/Onboarding/OnboardingView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header
content = content.replace(
  /<div className="text-center mb-10">\s*<h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Onboarding Hub<\/h1>\s*<p className="text-zinc-400">Complete your profile requirements to begin shifts<\/p>\s*<\/div>/,
  `<div className="mb-6 flex flex-col gap-1 border-b border-white/[0.05] pb-4">
          <h1 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Onboarding Hub</h1>
          <p className="text-xs text-zinc-500">Complete your profile requirements to begin shifts</p>
        </div>`
);

// Progress Container
content = content.replace(
  /className="bg-\[#111111\] border-t border-white\/\[0\.05\] rounded-xl p-6 shadow-lg relative overflow-hidden mb-8 mt-6"/,
  'className="bg-[#111111] border border-white/[0.05] rounded-lg p-4 shadow-sm relative overflow-hidden mb-6"'
);
content = content.replace(
  /className="flex justify-between text-sm font-medium mb-2"/,
  'className="flex justify-between text-[11px] font-medium mb-2"'
);
content = content.replace(
  /className="text-zinc-400 uppercase tracking-wider text-xs font-semibold"/,
  'className="text-zinc-500 uppercase tracking-wider font-semibold"'
);
content = content.replace(
  /className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden"/,
  'className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden"'
);

// Important Note
content = content.replace(
  /<div className="bg-amber-500\/10 border border-amber-500\/20 rounded-lg p-5 flex gap-4 mt-8">/g,
  '<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3 mt-6">'
);
content = content.replace(
  /<div className="w-10 h-10 rounded-full bg-amber-500\/20 text-amber-500 flex items-center justify-center shrink-0">/,
  '<div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">'
);
content = content.replace(
  /<span className="font-bold text-xl">!<\/span>/,
  '<span className="font-bold text-lg">!</span>'
);
content = content.replace(
  /<h4 className="font-medium text-amber-400 mb-1">IMPORTANT NOTE<\/h4>\s*<p className="text-sm text-zinc-400 leading-relaxed">/g,
  `<h4 className="font-medium text-sm text-amber-400 mb-0.5">IMPORTANT NOTE</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">`
);

// renderStepCard elements
content = content.replace(
  /className="p-5 flex items-center justify-between cursor-pointer select-none"/g,
  'className="p-3 md:p-4 flex items-center justify-between cursor-pointer select-none"'
);
content = content.replace(
  /className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border \${/g,
  'className={`w-8 h-8 rounded text-sm flex items-center justify-center shrink-0 border ${'
);
content = content.replace(
  /<h3 className="font-medium text-zinc-100">\{step\.title\}<\/h3>\s*<p className="text-zinc-500 text-sm mt-0\.5 max-w-xl">/g,
  `<h3 className="font-semibold text-sm text-zinc-200">{step.title}</h3>
              <p className="text-zinc-500 text-xs mt-0.5 max-w-xl">`
);
content = content.replace(
  /<div className="px-6 pb-6 pt-2">/g,
  '<div className="px-4 pb-4 pt-1">'
);

// Drag & drop upload box
content = content.replace(
  /className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-all text-center cursor-pointer \${/g,
  'className={`flex flex-col items-center justify-center gap-2 p-4 border border-dashed rounded-lg transition-all text-center cursor-pointer ${'
);
content = content.replace(
  /<p className="font-semibold text-sm text-zinc-200">/g,
  '<p className="font-medium text-xs text-zinc-300">'
);
content = content.replace(
  /<p className="text-\[11px\] text-\[#8B949E\]">Supports standard document & image formats<\/p>/g,
  '<p className="text-[10px] text-zinc-500">Supports standard document & image formats</p>'
);

// File list box
content = content.replace(
  /<div key=\{file\.id\} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white\/\[0\.12\] gap-2">/g,
  '<div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-zinc-800/80 rounded border border-white/[0.08] gap-2">'
);
content = content.replace(
  /<span className="text-\[14px\] font-medium text-white break-all">\{file\.name\}<\/span>/g,
  '<span className="text-xs font-medium text-zinc-200 break-all">{file.name}</span>'
);

// Form inputs
content = content.replace(
  /className="w-full bg-\[#1A1A1A\] border border-white\/\[0\.1\] rounded-lg px-3 py-2 text-white text-sm"/g,
  'className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded px-2.5 py-1.5 text-zinc-200 text-xs"'
);
content = content.replace(
  /<span className="text-xs text-brand-teal font-medium">/g,
  '<span className="text-[10px] text-brand-teal font-medium">'
);
content = content.replace(
  /<p className="text-\[10px\] text-zinc-500 mt-1">/g,
  '<p className="text-[10px] text-zinc-600 mt-1">'
);


// Save
fs.writeFileSync(file, content, 'utf8');
console.log('Compact styling patched');
