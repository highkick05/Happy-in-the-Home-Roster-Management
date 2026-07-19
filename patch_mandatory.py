import re

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

mandatory_old = """<div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
             <div>
               <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-1"><ClipboardList className="w-5 h-5 mr-2 text-brand-teal" /> Staff Compliance Matrix</h3>
               <p className="text-sm text-[#8B949E] max-w-3xl">
                 Track real-time completion status of mandatory on-boarding documents and expiration dates across the entire workforce.
               </p>
             </div>
             
             <button
               onClick={downloadComplianceMatrix}
               disabled={isGeneratingComplianceMatrix || loadingCompliance}
               className="shrink-0 flex items-center px-4 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded-md font-medium text-sm shadow-sm transition-all"
             >
               {isGeneratingComplianceMatrix ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/>
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
               {isGeneratingComplianceMatrix ? 'Exporting...' : 'Export Compliance Matrix (Excel)'}
             </button>
          </div>
          <div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-[#8B949E]" />
              </span>
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={complianceSearch}
                onChange={e => setComplianceSearch(e.target.value)}
                className="w-full bg-brand-navy border border-border-subtle rounded-md pl-10 pr-4 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all"
              />
            </div>
            <button
              onClick={fetchComplianceData}
              disabled={loadingCompliance}
              className="flex items-center px-4 py-2.5 text-sm text-[#E6EDF3] bg-zinc-805 hover:bg-zinc-800 border border-border-subtle rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingCompliance ? 'animate-spin' : ''}`} />
              Refresh Compliance Status
            </button>
          </div>"""

mandatory_new = """<div className="p-4 border-b border-border-subtle flex flex-col gap-3 relative bg-brand-bg">
             <div>
               <h3 className="text-base font-medium text-[#E6EDF3] flex items-center mb-1"><ClipboardList className="w-4 h-4 mr-2 text-brand-teal" /> Staff Compliance Matrix</h3>
               <p className="text-xs text-[#8B949E]">
                 Track real-time completion status of mandatory on-boarding documents and expiration dates across the entire workforce.
               </p>
             </div>
             
             <div className="flex flex-wrap items-end justify-between gap-3 mt-1">
                <div className="flex flex-col gap-1 w-64 shrink-0">
                  <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                    <input
                      type="text"
                      placeholder="Search staff by name or email..."
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
                      onClick={downloadComplianceMatrix}
                      disabled={isGeneratingComplianceMatrix || loadingCompliance}
                      className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded text-xs font-medium shadow-sm transition-all h-[30px]"
                    >
                      {isGeneratingComplianceMatrix ? (
                         <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"/>
                       ) : (
                         <Download className="w-3.5 h-3.5 mr-1.5" />
                       )}
                      {isGeneratingComplianceMatrix ? 'Exporting...' : 'Export Matrix'}
                    </button>
                </div>
             </div>
          </div>"""

text = text.replace(mandatory_old, mandatory_new)

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)

