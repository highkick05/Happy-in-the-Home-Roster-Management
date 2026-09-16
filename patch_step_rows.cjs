const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

// First remove the media_url block from the bottom
content = content.replace(/\{step\.media_url && \([\s\S]*?<div className="mt-3 flex items-center gap-2 text-\[12px\] text-brand-blue">[\s\S]*?<Video className="w-3\.5 h-3\.5" \/> Media Attached[\s\S]*?<\/div>[\s\S]*?\)\}/, '');

// Now add it to the tags section
const tagSectionEndRegex = /\{step\.is_mandatory === 0 && \([\s\S]*?<span className="inline-flex items-center gap-1 px-2 py-0\.5 rounded text-\[10px\] font-medium bg-zinc-500\/10 text-zinc-400 border border-zinc-500\/20 uppercase tracking-wider">[\s\S]*?Optional[\s\S]*?<\/span>[\s\S]*?\)\}/;

const mediaAttachedReplacement = `{step.is_mandatory === 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase tracking-wider">
                                        Optional
                                      </span>
                                    )}
                                    {step.media_url && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
                                        <Video className="w-3 h-3" /> Media
                                      </span>
                                    )}`;

content = content.replace(tagSectionEndRegex, mediaAttachedReplacement);
fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
