const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

// Update avatar size
code = code.replace(/w-8 h-8/g, 'w-6 h-6');

// Update message text
code = code.replace(/text-sm break-words/g, 'text-xs font-semibold tracking-wide break-words');
code = code.replace(/rounded-2xl/g, 'rounded-lg');

// Update message bubble colors to match side menu slightly more?
// The prompt says "same styling as the sidemenu, same size fonts and buttons"
// Currently own message is bg-brand-blue. Side menu uses text-[#8B949E] and active is bg-brand-green/10 text-white
// We can change bg-brand-blue to bg-brand-teal/10 text-white border border-brand-teal/30
code = code.replace(/'bg-brand-blue text-white rounded-tr-none'/g, "'bg-brand-teal/10 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-none'");
code = code.replace(/'bg-brand-bg text-zinc-200 border border-border-subtle rounded-tl-none'/g, "'bg-brand-navy text-[#8B949E] border border-border-subtle rounded-tl-none'");

// Input field
code = code.replace(/rounded-full px-4 py-2\.5 text-sm/g, 'rounded-lg px-3 py-2 text-xs font-semibold tracking-wide');
code = code.replace(/bg-brand-bg/g, 'bg-brand-navy'); // for input

// Send Button
code = code.replace(/bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2\.5 flex-shrink-0 transition-colors flex items-center justify-center/g, 
"flex items-center px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#E6EDF3] bg-brand-teal/10 border border-brand-teal/30 hover:bg-brand-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0");

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
console.log('Patched');
