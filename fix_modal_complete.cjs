const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

const target = `{(!initialData?.id || isHistorical) && (
                <>
                                  <button
                  type="button"
                  onClick={() => setIsHistorical(!isHistorical)}
                  className={\`w-10 h-5 rounded-full relative transition-colors \${isHistorical ? 'bg-amber-500' : 'bg-zinc-700'}\`}
                >
                  <div className={\`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform \${isHistorical ? 'translate-x-5' : 'translate-x-0'}\`} />
                </button>
              </div>

                  {isHistorical && (
                    <div className="space-y-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <div>
                    <label className="block text-[12px] font-medium text-amber-500 mb-1.5">Progress Note</label>
                    <textarea 
                      value={progressNote}
                      onChange={e => setProgressNote(e.target.value)}
                      rows={2}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600 resize-none"
                      placeholder="Historical note..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-amber-500 mb-1.5">Start Odo</label>
                      <input 
                        type="number"
                        value={startOdometer}
                        onChange={e => setStartOdometer(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-amber-500 mb-1.5">End Odo</label>
                      <input 
                        type="number"
                        value={endOdometer}
                        onChange={e => setEndOdometer(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}`;

code = code.replace(target, '');
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
console.log("Fixed AddShiftModal!");

let histCode = fs.readFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', 'utf-8');
const histTarget = `{(!initialData?.id || isHistorical) && (
                <>
                  
                  {isHistorical && (`;
histCode = histCode.replace(histTarget, `{isHistorical && (`);
const histTargetEnd = `)}
                </>
              )}`;
histCode = histCode.replace(histTargetEnd, `)}`);
fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', histCode);

