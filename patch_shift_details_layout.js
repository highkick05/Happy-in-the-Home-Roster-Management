import fs from 'fs';
const file = 'src/components/Roster/ShiftDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetJSX = `<div className="flex items-center justify-between mb-4 bg-zinc-800/50 p-3 rounded-lg border border-white/[0.05]">
                      <div className="flex items-center group relative cursor-help">
                        <span className="text-sm font-medium text-zinc-300">Did the client give enough notice?</span>
                        <div className="ml-2 bg-zinc-700 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-zinc-300">i</div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-zinc-800 border border-white/10 rounded-md text-xs text-zinc-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl pointer-events-none text-center">
                          Clients must provide at least {settings?.cancellationNoticePeriod || '24'} hours' notice if the participant cannot attend a scheduled support. Select "No" if you were inconvenienced by the lack of notice so that you will be paid for your time.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setClientGaveNotice(true)}
                          className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${clientGaveNotice ? 'bg-brand-teal text-zinc-950' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}\`}
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setClientGaveNotice(false)}
                          className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${!clientGaveNotice ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}\`}
                        >
                          No
                        </button>
                      </div>
                    </div>`;

const newJSX = `<div className="mb-5 bg-zinc-800/40 p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col gap-4">
                      <div>
                        <span className="text-sm md:text-base font-semibold text-zinc-200 block mb-1.5">Did the client give enough notice?</span>
                        <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                          Clients must provide at least {settings?.cancellationNoticePeriod || '24'} hours' notice if they cannot attend. Select "No" if you were inconvenienced by the lack of notice so that you will be paid for your time.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setClientGaveNotice(true)}
                          className={\`flex-1 py-3 px-4 text-sm md:text-base font-bold rounded-xl transition-all \${clientGaveNotice ? 'bg-brand-teal text-zinc-950 shadow-md ring-2 ring-brand-teal/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}\`}
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setClientGaveNotice(false)}
                          className={\`flex-1 py-3 px-4 text-sm md:text-base font-bold rounded-xl transition-all \${!clientGaveNotice ? 'bg-red-500 text-white shadow-md ring-2 ring-red-500/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}\`}
                        >
                          No
                        </button>
                      </div>
                    </div>`;

content = content.replace(targetJSX, newJSX);

fs.writeFileSync(file, content);
