import re

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

system_old = """<div className="p-5 border-b border-border-subtle flex items-center justify-between bg-brand-bg">
           <h3 className="text-sm font-semibold tracking-wide text-[#E6EDF3] flex items-center uppercase">
             <Search className="w-4 h-4 mr-2" /> Immutable System Logs (Read-Only)
           </h3>
           <span className="text-xs text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-sm font-medium border border-brand-teal/20">Tamper-Proof</span>
        </div>
        <div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50 flex flex-wrap items-center justify-start gap-4">
            <div className="flex flex-col gap-1.5 w-64">
              <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                <input 
                  type="text"
                  placeholder="Shift ID or Delta..."
                  value={auditSearchTerm}
                  onChange={e => {
                    setAuditSearchTerm(e.target.value);
                    setLogsPage(1);
                  }}
                  className="w-full bg-brand-navy border border-border-subtle rounded-md pl-8 pr-2 p-2 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                />
              </div>
            </div>
        </div>"""

system_new = """<div className="p-4 border-b border-border-subtle bg-brand-bg flex flex-col gap-3 relative">
           <div className="flex justify-between items-center">
               <h3 className="text-base font-medium text-[#E6EDF3] flex items-center"><Search className="w-4 h-4 mr-2 text-brand-teal" /> Immutable System Logs</h3>
               <span className="text-[10px] text-brand-teal bg-brand-teal/10 px-2 py-1 rounded font-semibold tracking-wider uppercase border border-brand-teal/20">Tamper-Proof</span>
           </div>
           
           <div className="flex flex-wrap items-end gap-3 mt-1">
               <div className="flex flex-col gap-1 w-64 shrink-0">
                 <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search System Logs</label>
                 <div className="relative">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                   <input 
                     type="text"
                     placeholder="Shift ID or Delta..."
                     value={auditSearchTerm}
                     onChange={e => {
                       setAuditSearchTerm(e.target.value);
                       setLogsPage(1);
                     }}
                     className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1.5 pl-8 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                   />
                 </div>
               </div>
           </div>
        </div>"""

text = text.replace(system_old, system_new)

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)

