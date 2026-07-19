import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    old_content = """        <div className="p-4 border-b border-border-subtle bg-brand-bg flex flex-col gap-3 relative">
           <div className="flex justify-between items-center">
               <h3 className="text-sm font-medium text-[#E6EDF3] flex items-center"><Search className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Immutable System Logs</h3>
               <span className="text-[10px] text-brand-teal bg-brand-teal/10 px-2 py-1 rounded font-semibold tracking-wider uppercase border border-brand-teal/20">Tamper-Proof</span>
           </div>
           
           <div className="flex flex-wrap items-end gap-3 mt-1">
               <div className="flex flex-col gap-1 w-64 shrink-0">
                 <label className="text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider">Search System Logs</label>
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
                     className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1 pl-7 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                   />
                 </div>
               </div>
           </div>
        </div>
        <div className="p-5">
           <p className="text-xs text-[#8B949E] mb-4">
             This table securely records any manual administrative edits made to a shift after completion. It cannot be altered via the UI.
           </p>
           <div className="bg-brand-navy rounded-lg border border-border-subtle overflow-x-auto min-h-[150px]">"""
           
    new_content = """        <div className="px-4 py-2.5 border-b border-border-subtle bg-brand-bg flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative">
             <div className="flex-1">
               <div className="flex items-center gap-2 mb-0.5">
                   <h3 className="text-sm font-medium text-[#E6EDF3] flex items-center mb-0"><Search className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Immutable System Logs</h3>
                   <span className="text-[10px] text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase border border-brand-teal/20">Tamper-Proof</span>
               </div>
               <p className="text-xs text-[#8B949E] m-0">
                 Securely records any manual administrative edits made to a shift after completion. Cannot be altered via the UI.
               </p>
             </div>
             
             <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 w-56 shrink-0">
                  <label className="text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider shrink-0 whitespace-nowrap">Search Logs</label>
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input 
                      type="text"
                      placeholder="Shift ID or Delta..."
                      value={auditSearchTerm}
                      onChange={e => {
                        setAuditSearchTerm(e.target.value);
                        setLogsPage(1);
                      }}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1 pl-7 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                    />
                  </div>
                </div>
             </div>
        </div>
        <div className="p-4">
           <div className="bg-brand-navy rounded-lg border border-border-subtle overflow-x-auto min-h-[150px]">"""

    if old_content in text:
        text = text.replace(old_content, new_content)
    else:
        print("Could not find content")
        
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')
