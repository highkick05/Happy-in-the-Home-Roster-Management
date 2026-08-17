import fs from 'fs';
const file = 'src/components/Roster/ActiveShiftModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetJSX = `<label className="block text-sm md:text-base font-semibold text-zinc-300 mb-2">Reason for Cancellation</label>`;

const newJSX = `<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-zinc-800/50 p-3 rounded-lg border border-white/[0.05] gap-3">
                    <div className="flex items-center group relative cursor-help">
                      <span className="text-sm font-medium text-zinc-300">Did the client give enough notice?</span>
                      <div className="ml-2 bg-zinc-700 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-zinc-300 shrink-0">i</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl pointer-events-none text-center">
                        Clients must provide at least {settings?.cancellationNoticePeriod || '24'} hours' notice if the participant cannot attend a scheduled support. Select "No" if you were inconvenienced by the lack of notice so that you will be paid for your time.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setClientGaveNotice(true)}
                        className={\`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none \${clientGaveNotice ? 'bg-brand-teal text-zinc-950' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}\`}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setClientGaveNotice(false)}
                        className={\`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none \${!clientGaveNotice ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}\`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  <label className="block text-sm md:text-base font-semibold text-zinc-300 mb-2">Reason for Cancellation</label>`;

content = content.replace(targetJSX, newJSX);

fs.writeFileSync(file, content);
