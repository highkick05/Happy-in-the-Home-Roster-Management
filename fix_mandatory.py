with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start = text.find("activeTab === 'mandatory_documents' && (")
start = text.find('<div className="p-4 md:p-6 border-b', start)
end = text.find('<div className="bg-brand-navy">', start)

mandatory_new = """<div className="p-4 border-b border-border-subtle flex flex-col gap-3 relative bg-brand-bg">
             <div>
               <h3 className="text-base font-medium text-[#E6EDF3] flex items-center mb-1"><ClipboardList className="w-4 h-4 mr-2 text-brand-teal" /> Staff Compliance Matrix</h3>
               <p className="text-xs text-[#8B949E]">
                 Summary list of all flat matrix mandatory compliance items for active personnel. Staff members receive automatic daily reminders for expiring credentials.
               </p>
             </div>
             
             <div className="flex flex-wrap items-end justify-between gap-3 mt-1">
                <div className="flex flex-col gap-1 w-64 shrink-0">
                  <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search Staff</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={complianceSearch}
                      onChange={e => setComplianceSearch(e.target.value)}
                      className="w-full bg-brand-navy border border-border-subtle rounded px-2.5 py-1.5 pl-8 text-xs text-[#E6EDF3] placeholder:text-[#8B949E]/50 focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <button
                      onClick={fetchComplianceData}
                      disabled={loadingCompliance}
                      className="flex items-center px-3 py-1.5 text-xs text-[#E6EDF3] bg-brand-navy hover:bg-white/5 border border-border-subtle rounded transition-colors h-[30px]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingCompliance ? 'animate-spin' : ''}`} />
                      Refresh Data
                    </button>
                    <button
                      onClick={() => {
                        // Using a standard export action or similar if available, or just keeping the button matching the style.
                        alert("Export not implemented for matrix view");
                      }}
                      disabled={loadingCompliance}
                      className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded text-xs font-medium shadow-sm transition-all h-[30px]"
                    >
                       <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export Matrix
                    </button>
                </div>
             </div>
          </div>
          """

if start != -1 and end != -1:
    text = text[:start] + mandatory_new + text[end:]
    print("Mandatory replaced")
else:
    print("Mandatory failed")

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)

