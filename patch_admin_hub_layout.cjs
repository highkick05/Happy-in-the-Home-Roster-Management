const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

// 1. Remove max-w-6xl
content = content.replace(/<div className="max-w-6xl mx-auto space-y-4">/, '<div className="w-full mx-auto space-y-4">');

// 2. Make the non-editing row more compact and clickable
const nonEditingRegex = /\) : \(\s*<div className="p-5 flex gap-4">/;
const nonEditingReplacement = `) : (
                          <div 
                            onClick={(e) => {
                              // If they click on the delete button, don't trigger edit
                              if ((e.target as HTMLElement).closest('button[title="Delete Step"]')) return;
                              setIsEditing(step.id); 
                              setEditForm(step);
                            }}
                            className="p-3 md:p-4 flex gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors group relative items-center"
                          >`;

content = content.replace(nonEditingRegex, nonEditingReplacement);

// 3. The step numbering icon can be a bit smaller
content = content.replace(/<div className="w-8 h-8 rounded-full bg-white\/5 border border-white\/10 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0 mt-1">/g, '<div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 text-[11px] font-bold shrink-0">');

// 4. Adjust the title and action buttons area to be tighter
const headerRegex = /<div>\s*<h3 className="text-\[15px\] font-semibold text-white">\{step\.title\}<\/h3>\s*<div className="flex items-center gap-2 mt-1\.5 flex-wrap">/;
const headerReplacement = `<div>
                                  <h3 className="text-[14px] font-semibold text-white group-hover:text-brand-teal transition-colors">{step.title}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">`;
content = content.replace(headerRegex, headerReplacement);

fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
