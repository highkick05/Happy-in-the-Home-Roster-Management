const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'requires_expiry: number;',
  'requires_expiry: number;\n  upload_required: number;\n  is_mandatory: number;'
);

content = content.replace(
  "requires_expiry: false",
  "requires_expiry: 0,\n          upload_required: 1,\n          is_mandatory: 1"
);

const checkboxesStr = `
                            <div className="grid grid-cols-1 gap-2 pt-2">
                              <label className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors">
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.upload_required ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.upload_required ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={!!editForm.upload_required}
                                  onChange={e => setEditForm({...editForm, upload_required: e.target.checked ? 1 : 0})}
                                />
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Upload Required</span>
                                  <span className="text-[11px] text-zinc-500 block">Require staff to upload a document for this step.</span>
                                </div>
                              </label>

                              <label className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors">
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.is_mandatory ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.is_mandatory ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={!!editForm.is_mandatory}
                                  onChange={e => setEditForm({...editForm, is_mandatory: e.target.checked ? 1 : 0})}
                                />
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Mandatory Step</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff cannot be rostered until this step is completed.</span>
                                </div>
                              </label>

                              <label className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors">
                                <div className={\`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.requires_expiry ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}\`}>
                                  {editForm.requires_expiry ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={!!editForm.requires_expiry}
                                  onChange={e => setEditForm({...editForm, requires_expiry: e.target.checked ? 1 : 0})}
                                />
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Track Expiry via Cron Engine</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff will receive alerts when documents uploaded here expire.</span>
                                </div>
                              </label>
                            </div>
`;

content = content.replace(
  /<label className="flex items-center gap-3 p-3 bg-black\/20 border border-white\/\[0\.05\] rounded-lg cursor-pointer group hover:bg-black\/40 transition-colors">[\s\S]*?<\/label>/,
  checkboxesStr
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched admin hub ui');
