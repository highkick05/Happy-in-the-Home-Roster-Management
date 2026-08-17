import fs from 'fs';
const file = 'src/components/Roster/ActiveShiftModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetJSX = `<div className="mb-5 bg-zinc-800/40 p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col gap-4">
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

const newJSX = `<div className="mb-5 bg-zinc-800/40 p-3 sm:p-4 rounded-xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <span className="text-sm md:text-base font-medium text-zinc-200">
                      Did the client give {settings?.cancellationNoticePeriod || '24'} hours' notice?
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => setClientGaveNotice(true)}
                        className={\`flex-1 sm:flex-none py-2 px-6 text-sm font-bold rounded-lg transition-all \${clientGaveNotice ? 'bg-brand-teal text-zinc-950 shadow-md ring-2 ring-brand-teal/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}\`}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setClientGaveNotice(false)}
                        className={\`flex-1 sm:flex-none py-2 px-6 text-sm font-bold rounded-lg transition-all \${!clientGaveNotice ? 'bg-red-500 text-white shadow-md ring-2 ring-red-500/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}\`}
                      >
                        No
                      </button>
                    </div>
                  </div>`;

content = content.replace(targetJSX, newJSX);

fs.writeFileSync(file, content);
