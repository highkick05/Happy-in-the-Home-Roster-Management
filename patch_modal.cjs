const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf8');

// Add states
const stateMatch = "const [conflictList, setConflictList] = useState<any[]>([]);";
const newStates = `
  const [isHistorical, setIsHistorical] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');
`;
code = code.replace(stateMatch, stateMatch + "\n" + newStates);

// Add to bodyData in saveData
const bodyDataMatch = "const bodyData: any = {";
const newBodyData = `
      is_historical: isHistorical,
      progress_note: progressNote,
      start_odometer: startOdometer ? Number(startOdometer) : null,
      end_odometer: endOdometer ? Number(endOdometer) : null,
`;
code = code.replace(bodyDataMatch, bodyDataMatch + newBodyData);

// Update Qty inputs to override Auto if isHistorical
const autoSpanMatch = `                              {isTravelOrTransport ? (
                                <span className="text-zinc-500 italic">Auto</span>
                              ) : unit === 'Hour' ? (`

const newAutoSpan = `                              {isTravelOrTransport && !isHistorical ? (
                                <span className="text-zinc-500 italic">Auto</span>
                              ) : unit === 'Hour' ? (`

code = code.replace(autoSpanMatch, newAutoSpan);

// Update info pill
const infoPillMatch = `                          {isTravelOrTransport ? (
                             <div className="text-left md:text-right flex-1 md:ml-4">
                               <span className="inline-block px-2 py-1 bg-indigo-900/40 text-brand-teal rounded border border-brand-teal/30 text-xs">
                                 {isProviderTravel 
                                   ? 'Auto-calculated via roster gaps upon save.' 
                                   : 'Calculated post-shift via worker waypoints.'}
                               </span>
                             </div>
                          ) : (`

const newInfoPill = `                          {isTravelOrTransport ? (
                             <div className="text-left md:text-right flex-1 md:ml-4">
                               <span className="inline-block px-2 py-1 bg-indigo-900/40 text-brand-teal rounded border border-brand-teal/30 text-xs">
                                 {isHistorical ? 'Manual entry enabled for historical shift.' : (isProviderTravel 
                                   ? 'Auto-calculated via roster gaps upon save.' 
                                   : 'Calculated post-shift via worker waypoints.')}
                               </span>
                             </div>
                          ) : (`
code = code.replace(infoPillMatch, newInfoPill);

// Add Historical toggle and fields
const formStartMatch = `            {/* Left Column: Core Info */}
            <div className="md:w-[320px] shrink-0 space-y-4">`;

const historicalUI = `
              <div className="flex items-center justify-between bg-[#18181b] p-3 rounded-lg border border-amber-500/30">
                <div>
                  <h4 className="text-[13px] font-semibold text-amber-500">Historical Shift Migration</h4>
                  <p className="text-[11px] text-zinc-400">Instantly complete shift & save manual data</p>
                </div>
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
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-amber-500 mb-1.5">End Odo</label>
                      <input 
                        type="number"
                        value={endOdometer}
                        onChange={e => setEndOdometer(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              )}
`;

code = code.replace(formStartMatch, formStartMatch + historicalUI);

fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
console.log('patched modal');
