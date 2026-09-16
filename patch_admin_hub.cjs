const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center border border-brand-teal/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <FileCheck className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Onboarding Hub Manager</h1>
            <p className="text-zinc-400 text-sm mt-1">Design specific onboarding flows and requirements for different staff positions.</p>
          </div>
        </div>`;

const replacement = `<div className="mb-4 flex flex-col gap-0.5 border-b border-white/[0.05] pb-3">
          <h1 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Onboarding Hub Manager</h1>
          <p className="text-xs text-zinc-500">Design specific onboarding flows and requirements for different staff positions</p>
        </div>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('patched header');
