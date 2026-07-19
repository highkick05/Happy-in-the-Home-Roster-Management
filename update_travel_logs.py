import re

with open('/app/applet/src/components/TravelLogsView.tsx', 'r') as f:
    text = f.read()

# 1. Add searchTerm state
state_match = "const [endDate, setEndDate] = useState<Date | null>(null);"
state_replacement = "const [endDate, setEndDate] = useState<Date | null>(null);\n  const [searchTerm, setSearchTerm] = useState('');"
text = text.replace(state_match, state_replacement)

# 2. Add filteredExpandedLogs logic
expanded_logs_match = """  const totalPTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_km) || 0), 0);"""
filtered_logic = """
  const filteredExpandedLogs = expandedLogs.filter(log => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      
      const idMatch = log.id.toString().toLowerCase().includes(lowerTerm);
      const routeMatch = (log._route || '').toLowerCase().includes(lowerTerm);
      
      return idMatch || routeMatch;
  });

  const totalPTKm = filteredExpandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_km) || 0), 0);"""
text = text.replace(expanded_logs_match, filtered_logic)

# Replace remaining `expandedLogs.reduce` with `filteredExpandedLogs.reduce`
text = text.replace('const totalPTCost = expandedLogs.reduce', 'const totalPTCost = filteredExpandedLogs.reduce')
text = text.replace('const totalABTKm = expandedLogs.reduce', 'const totalABTKm = filteredExpandedLogs.reduce')
text = text.replace('const totalABTCost = expandedLogs.reduce', 'const totalABTCost = filteredExpandedLogs.reduce')

# 3. Add search input field
filters_match = """        {/* Filters */}
        <div className="flex flex-wrap items-center justify-start gap-4">
          <div className="flex flex-wrap items-center gap-3">"""
search_field = """        {/* Filters */}
        <div className="flex flex-wrap items-center justify-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1.5 w-48">
              <label className="text-[9px] font-semibold text-[#8B949E] uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
                <input 
                  type="text"
                  placeholder="Search Shift ID or Route..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-brand-navy border border-border-subtle rounded-md pl-8 pr-2 py-1 text-xs text-[#E6EDF3] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all placeholder:text-[#8B949E]/50"
                />
              </div>
            </div>"""
text = text.replace(filters_match, search_field)

# 4. Update references to expandedLogs in rendering
text = text.replace('expandedLogs.length === 0', 'filteredExpandedLogs.length === 0')
text = text.replace('expandedLogs.slice', 'filteredExpandedLogs.slice')
text = text.replace('expandedLogs.length > 0', 'filteredExpandedLogs.length > 0')
text = text.replace('expandedLogs.length}', 'filteredExpandedLogs.length}')

# Replace other occurrences carefully
text = text.replace('expandedLogs.length)', 'filteredExpandedLogs.length)')
text = text.replace('expandedLogs.length / pageSize', 'filteredExpandedLogs.length / pageSize')

with open('/app/applet/src/components/TravelLogsView.tsx', 'w') as f:
    f.write(text)

