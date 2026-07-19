import re

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

# 1. Add state variables
state_vars = """
  const [evidenceSearchTerm, setEvidenceSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
"""
text = text.replace("const [evidencePage, setEvidencePage] = useState(1);", state_vars + "  const [evidencePage, setEvidencePage] = useState(1);")

# 2. Add filtered variables
filtered_vars = """
  const filteredEvidenceMatrix = evidenceMatrix.filter(row => {
      if (!evidenceSearchTerm) return true;
      const term = evidenceSearchTerm.toLowerCase();
      const idMatch = String(row.shift_id || '').toLowerCase().includes(term);
      const route = formatRouteLog(row.transport_route_log, row) || 'No route logged';
      const routeMatch = route.toLowerCase().includes(term);
      return idMatch || routeMatch;
  });

  const filteredStaffMatrix = staffMatrix.filter(row => {
      if (!staffSearchTerm) return true;
      const term = staffSearchTerm.toLowerCase();
      const idMatch = String(row.shift_id || '').toLowerCase().includes(term);
      const route = formatRouteLog(row.transport_route_log, row) || 'No route logged';
      const routeMatch = route.toLowerCase().includes(term);
      return idMatch || routeMatch;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
      if (!auditSearchTerm) return true;
      const term = auditSearchTerm.toLowerCase();
      const idMatch = String(log.entity_id || '').toLowerCase().includes(term);
      const oldV = JSON.parse(log.old_value || '{}');
      const newV = JSON.parse(log.new_value || '{}');
      const changedKeys = Object.keys(newV).filter(k => newV[k] !== oldV[k] && k !== 'actual_finish_time' && k !== 'notes');
      const deltaStr = changedKeys.map(k => `${k}: ${oldV[k]} -> ${newV[k]}`).join(', ').toLowerCase();
      return idMatch || deltaStr.includes(term);
  });
"""
text = text.replace("return (", filtered_vars + "\n  return (", 1)

# 3. Add Evidence search field
search_ev = """<div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                  <input 
                    type="text"
                    placeholder="Shift ID or Route..."
                    value={evidenceSearchTerm}
                    onChange={e => {
                      setEvidenceSearchTerm(e.target.value);
                      setEvidencePage(1);
                    }}
                    className="w-full bg-brand-navy border border-border-subtle rounded-md pl-8 pr-2 p-2.5 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">"""
text = text.replace("""<div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-sm font-medium text-[#8B949E]">Filter by Client</label>""", search_ev + "\n                 <label className=\"text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider\">Filter by Client</label>")

text = text.replace('<label className="text-sm font-medium text-[#8B949E]">Start Date</label>', '<label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Start Date</label>', 1)
text = text.replace('<label className="text-sm font-medium text-[#8B949E]">End Date</label>', '<label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">End Date</label>', 1)

# 4. Add Staff search field
search_st = """<div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                  <input 
                    type="text"
                    placeholder="Shift ID or Route..."
                    value={staffSearchTerm}
                    onChange={e => {
                      setStaffSearchTerm(e.target.value);
                      setStaffPage(1);
                    }}
                    className="w-full bg-brand-navy border border-border-subtle rounded-md pl-8 pr-2 p-2.5 text-sm text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">"""
text = text.replace("""<div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-sm font-medium text-[#8B949E]">Select Staff</label>""", search_st + "\n                 <label className=\"text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider\">Select Staff</label>")

text = text.replace('<label className="text-sm font-medium text-[#8B949E]">Start Date</label>', '<label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">Start Date</label>', 1)
text = text.replace('<label className="text-sm font-medium text-[#8B949E]">End Date</label>', '<label className="text-[10px] font-semibold text-[#8B949E] uppercase tracking-wider">End Date</label>', 1)

# 5. Add Audit search field
search_au = """        <div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50 flex flex-wrap items-center justify-start gap-4">
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
        </div>
        <div className="p-5">"""
text = text.replace("""        </div>
        <div className="p-5">
           <p className="text-sm text-[#8B949E] mb-4">
             This table securely records any manual administrative edits made to a shift after completion. It cannot be altered via the UI.
           </p>""", search_au + """
           <p className="text-sm text-[#8B949E] mb-4">
             This table securely records any manual administrative edits made to a shift after completion. It cannot be altered via the UI.
           </p>""")

# 6. Replace arrays with filtered arrays
# For Evidence Matrix
text = text.replace('evidenceMatrix.length === 0', 'filteredEvidenceMatrix.length === 0')
text = text.replace('evidenceMatrix.slice', 'filteredEvidenceMatrix.slice')
text = text.replace('evidenceMatrix.length > 0', 'filteredEvidenceMatrix.length > 0')
text = text.replace('evidenceMatrix.length}', 'filteredEvidenceMatrix.length}')
text = text.replace('evidenceMatrix.length / evidencePageSize', 'filteredEvidenceMatrix.length / evidencePageSize')
text = text.replace('evidenceMatrix.length)', 'filteredEvidenceMatrix.length)')

# For Staff Matrix
text = text.replace('staffMatrix.length === 0', 'filteredStaffMatrix.length === 0')
text = text.replace('staffMatrix.slice', 'filteredStaffMatrix.slice')
text = text.replace('staffMatrix.length > 0', 'filteredStaffMatrix.length > 0')
text = text.replace('staffMatrix.length}', 'filteredStaffMatrix.length}')
text = text.replace('staffMatrix.length / staffPageSize', 'filteredStaffMatrix.length / staffPageSize')
text = text.replace('staffMatrix.length)', 'filteredStaffMatrix.length)')

# For Audit Logs
text = text.replace('auditLogs.length > 0', 'filteredAuditLogs.length > 0')
text = text.replace('auditLogs.map', 'filteredAuditLogs.slice((logsPage - 1) * logsPageSize, logsPage * logsPageSize).map')
text = text.replace('auditLogs.length}', 'filteredAuditLogs.length}')
text = text.replace('auditLogs.length / logsPageSize', 'filteredAuditLogs.length / logsPageSize')
text = text.replace('auditLogs.length)', 'filteredAuditLogs.length)')

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)
