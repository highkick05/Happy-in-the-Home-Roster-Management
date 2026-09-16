const fs = require('fs');
const file = 'src/components/AdminOnboarding/AdminOnboardingHub.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
                                  {step.requires_expiry === 1 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                      <AlertCircle className="w-3 h-3" /> Expiry Tracked
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setIsEditing(step.id); setEditForm(step); }} className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-colors">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
`;

const replaceStr = `
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {step.requires_expiry === 1 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                        <AlertCircle className="w-3 h-3" /> Expiry Tracked
                                      </span>
                                    )}
                                    {step.upload_required === 1 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                                        Upload Required
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase tracking-wider">
                                        Confirmation Only
                                      </span>
                                    )}
                                    {step.is_mandatory === 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase tracking-wider">
                                        Optional
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 transition-opacity">
                                  <button onClick={() => { setIsEditing(step.id); setEditForm(step); }} className="p-2 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-colors" title="Edit Step">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete Step">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
`;

content = content.replace(targetStr.trim(), replaceStr.trim());
fs.writeFileSync(file, content, 'utf8');
console.log('patched admin hub list controls');
