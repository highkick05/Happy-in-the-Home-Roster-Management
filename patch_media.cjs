const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

const regex = /\{step\.media_url && \([\s\S]*?<Video className="w-3\.5 h-3\.5" \/> Media Attached[\s\S]*?<\/div>\s*\)\}/;
                                     
const replacement = `{step.media_url && (
                                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
                                         <Video className="w-3 h-3" /> Media Attached
                                       </span>
                                     )}`;
                                     
content = content.replace(regex, replacement);
fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
