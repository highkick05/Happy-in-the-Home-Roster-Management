with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start_staff = text.find("activeTab === 'staff' && (")
start_staff = text.find('<div className="p-4 md:p-6 border-b', start_staff)
end_staff = text.find('<div className="overflow-x-auto">', start_staff)

staff_new = """<div className="p-4 border-b border-border-subtle flex flex-col gap-3 relative">
             <div>
               <h3 className="text-base font-medium text-[#E6EDF3] flex items-center mb-1"><FileText className="w-4 h-4 mr-2 text-brand-green" /> Staff Logbook (Workforce Compliance)</h3>
               <p className="text-xs text-[#8B949E]">
                 Produces an Hours Worked Report and a Vehicle Usage Statement showing precise times, shift statuses, and claimed distance.
               </p>
               {staffExportError && (
                 <div className="mt-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-md font-medium">
                   {staffExportError}
                 </div>
               )}
             </div>
             
             <div className="flex flex-wrap items-end gap-3 mt-1">
                <div className="flex flex-col gap-1 w-48 shrink-0">
                  <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input 
                      type="text"
                      placeholder="Shift ID or Route..."
                      value={staffSearchTerm}
                      onChange={e => {
                        setStaffSearchTerm(e.target.value);
                        setStaffPage(1);
                      }}
                      className="w-full bg-brand-bg border border-border-subtle rounded px-2.5 py-1.5 pl-8 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-56 shrink-0">
                   <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Select Staff</label>
                   <select 
                     value={selectedStaff} 
                     onChange={e => setSelectedStaff(e.target.value)}
                     className="w-full bg-brand-bg border border-border-subtle rounded px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors outline-none"
                   >
                     <option value="">All Staff (Global Ledger)</option>
                     {staffList.filter(s => s.role === 'STAFF').map(s => (
                       <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                     ))}
                   </select>
                </div>
                <div className="flex flex-col gap-1 w-32 shrink-0">
                   <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Start Date</label>
                   <CustomDatePicker 
                      position="bottom"
                     value={staffStartDate} 
                     onChange={e => setStaffStartDate(e.target.value)}
                     className="w-full bg-brand-bg border border-border-subtle rounded px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal min-h-[30px] transition-colors outline-none" 
                   />
                </div>
                <div className="flex flex-col gap-1 w-32 shrink-0">
                   <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">End Date</label>
                   <CustomDatePicker 
                      position="bottom"
                     value={staffEndDate} 
                     onChange={e => setStaffEndDate(e.target.value)}
                     className="w-full bg-brand-bg border border-border-subtle rounded px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal min-h-[30px] transition-colors outline-none" 
                   />
                </div>
                <div className="ml-auto">
                   <button
                     onClick={downloadStaffLedger}
                     disabled={isGeneratingLogbook || loadingStaffMatrix}
                     className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded text-xs font-medium shadow-sm transition-all h-[30px]"
                   >
                     {isGeneratingLogbook ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"/>
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                      )}
                     {isGeneratingLogbook ? 'Exporting...' : 'Export Staff Logbook'}
                   </button>
                </div>
             </div>
           </div>
           """

if start_staff != -1 and end_staff != -1:
    text = text[:start_staff] + staff_new + text[end_staff:]
    print("Staff replaced")
else:
    print("Staff failed")

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)

