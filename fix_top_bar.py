import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    old_content = """          <div className="px-4 py-2.5 border-b border-border-subtle flex flex-col gap-1.5 relative bg-brand-bg">
             <div>
               <h3 className="text-sm font-medium text-[#E6EDF3] flex items-center mb-0.5"><ClipboardList className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Staff Compliance Matrix</h3>
               <p className="text-xs text-[#8B949E]">
                 Summary list of all flat matrix mandatory compliance items for active personnel. Staff members receive automatic daily reminders for expiring credentials.
               </p>
             </div>
             
             <div className="flex flex-wrap items-end justify-between gap-3 mt-1">
                <div className="flex flex-col gap-1 w-64 shrink-0">
                  <label className="text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider">Search Staff</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={complianceSearch}
                      onChange={e => setComplianceSearch(e.target.value)}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1 pl-7 text-xs text-[#E6EDF3] placeholder:text-[#8B949E]/50 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 ml-auto">"""
                
    new_content = """          <div className="px-4 py-2.5 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative bg-brand-bg">
             <div className="flex-1">
               <h3 className="text-sm font-medium text-[#E6EDF3] flex items-center mb-0.5"><ClipboardList className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Staff Compliance Matrix</h3>
               <p className="text-xs text-[#8B949E] m-0">
                 Summary list of all flat matrix mandatory compliance items for active personnel. Staff members receive automatic daily reminders for expiring credentials.
               </p>
             </div>
             
             <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 w-56 shrink-0">
                  <label className="text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider shrink-0 whitespace-nowrap">Search Staff</label>
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input
                      type="text"
                      placeholder="Name or email..."
                      value={complianceSearch}
                      onChange={e => setComplianceSearch(e.target.value)}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1 pl-7 text-xs text-[#E6EDF3] placeholder:text-[#8B949E]/50 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">"""

    if old_content in text:
        text = text.replace(old_content, new_content)
    else:
        print("Could not find content")
        
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')
