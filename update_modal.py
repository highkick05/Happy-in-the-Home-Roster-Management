import re

with open('src/components/Roster/ActiveShiftModal.tsx', 'r') as f:
    text = f.read()

state_target = "  const [notes, setNotes] = useState('');"
state_replacement = "  const [notes, setNotes] = useState('');\n  const [isIncident, setIsIncident] = useState(false);"
text = text.replace(state_target, state_replacement)

payload_target = """    const payload = {
      actual_start_time: actualStart.toISOString(),
      actual_finish_time: actualFinish.toISOString(),
      notes: notes,
      abtCoordinates: resolvedWaypoints,
      odometer_end_reading: odometerReading ? Math.round(Number(odometerReading)).toString() : '',
      odometer_end_photo: odometerPhoto
    };"""

payload_replacement = """    const payload = {
      actual_start_time: actualStart.toISOString(),
      actual_finish_time: actualFinish.toISOString(),
      notes: notes,
      abtCoordinates: resolvedWaypoints,
      odometer_end_reading: odometerReading ? Math.round(Number(odometerReading)).toString() : '',
      odometer_end_photo: odometerPhoto,
      is_incident: isIncident
    };"""

text = text.replace(payload_target, payload_replacement)

ui_target = """                {/* 3. Shift Notes & Observations */}
                <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/[0.08] flex flex-col">
                  <label className="block text-sm md:text-base font-medium text-zinc-300 mb-2">Shift Notes & Observations</label>
                  <textarea 
                    rows={6} 
                    className="w-full bg-[#09090b] border border-white/[0.12]/50 rounded-xl p-4 text-sm md:text-base text-zinc-100 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal shadow-inner resize-y transition-colors"
                    placeholder="Log any incidents, tasks completed, client mood, etc."
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                  />
                </div>"""

ui_replacement = """                {/* 3. Shift Notes & Observations */}
                <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/[0.08] flex flex-col space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm md:text-base font-medium text-zinc-300">Shift Notes & Observations</label>
                      <label className="flex items-center cursor-pointer gap-2">
                        <span className={`text-sm font-medium ${isIncident ? 'text-red-400' : 'text-zinc-400'}`}>Has an Incident occurred?</span>
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isIncident ? 'bg-red-500' : 'bg-zinc-700'}`}>
                           <input type="checkbox" className="sr-only" checked={isIncident} onChange={(e) => setIsIncident(e.target.checked)} />
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isIncident ? 'translate-x-4' : 'translate-x-1'}`} />
                        </div>
                      </label>
                    </div>
                    <textarea 
                      rows={6} 
                      className={`w-full bg-[#09090b] border border-white/[0.12]/50 rounded-xl p-4 text-sm md:text-base text-zinc-100 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal shadow-inner resize-y transition-colors ${isIncident ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder={isIncident ? "Please describe the incident in detail..." : "Log any incidents, tasks completed, client mood, etc."}
                      value={notes}
                      onChange={e => handleNotesChange(e.target.value)}
                    />
                  </div>
                  {isIncident && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                      <Info className="w-5 h-5 shrink-0" />
                      <p>This note will be submitted as an <strong>Incident</strong>, alerting administration for further policy action.</p>
                    </div>
                  )}
                </div>"""

text = text.replace(ui_target, ui_replacement)

with open('src/components/Roster/ActiveShiftModal.tsx', 'w') as f:
    f.write(text)
