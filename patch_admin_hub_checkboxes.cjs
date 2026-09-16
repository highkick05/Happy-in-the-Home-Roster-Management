const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const checkboxesStr = `
                            <div className="grid grid-cols-1 gap-2 pt-2">
                              <div 
                                onClick={() => setEditForm({...editForm, upload_required: editForm.upload_required ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.upload_required ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.upload_required ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Upload Required</span>
                                  <span className="text-[11px] text-zinc-500 block">Require staff to upload a document for this step.</span>
                                </div>
                              </div>

                              <div 
                                onClick={() => setEditForm({...editForm, is_mandatory: editForm.is_mandatory ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.is_mandatory ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.is_mandatory ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Mandatory Step</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff cannot be rostered until this step is completed.</span>
                                </div>
                              </div>

                              <div 
                                onClick={() => setEditForm({...editForm, requires_expiry: editForm.requires_expiry ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.requires_expiry ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.requires_expiry ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Track Expiry via Cron Engine</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff will receive alerts when documents uploaded here expire.</span>
                                </div>
                              </div>
                            </div>
`;

content = content.replace(
  /<div className="grid grid-cols-1 gap-2 pt-2">[\s\S]*?<\/div>\s*<\/label>\s*<\/div>/,
  checkboxesStr
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched checkboxes to use divs');
