import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Modify the staff matrix row
    old_row_start = """                        {/* Staff Header Row */}
                        <div 
                          onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer select-none gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#E6EDF3] font-medium text-15px flex items-center gap-2">
                              <span>{staff.first_name} {staff.last_name}</span>
                              <span className="text-xs text-[#8B949E] font-normal">({staff.email})</span>
                            </h4>
                            <p className="text-xs text-[#8B949E] mt-1 flex items-center gap-2">
                              <span>Compliance Stats: <strong className="text-[#E6EDF3] font-medium">{stats.totalUploaded} of {Object.keys(ONBOARDING_STEP_LABELS).length}</strong> items uploaded</span>
                              <span>•</span>
                              <span>Missing: <strong className="text-[#E6EDF3] font-medium">{stats.missing}</strong> items</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">"""

    new_row_start = """                        {/* Staff Header Row */}
                        <div 
                          onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                          className="flex items-center justify-between px-4 py-2 cursor-pointer select-none gap-4"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <h4 className="text-[#E6EDF3] font-medium text-[13px] whitespace-nowrap flex items-center gap-1.5 shrink-0">
                              <span>{staff.first_name} {staff.last_name}</span>
                              <span className="text-[11px] text-[#8B949E] font-normal">({staff.email})</span>
                            </h4>
                            <p className="text-[11px] text-[#8B949E] flex items-center gap-2 border-l border-white/10 pl-3 m-0 whitespace-nowrap overflow-hidden text-ellipsis">
                              <span>Compliance Stats: <strong className="text-[#E6EDF3] font-medium">{stats.totalUploaded} of {Object.keys(ONBOARDING_STEP_LABELS).length}</strong> items uploaded</span>
                              <span>•</span>
                              <span>Missing: <strong className="text-[#E6EDF3] font-medium">{stats.missing}</strong> items</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">"""

    text = text.replace(old_row_start, new_row_start)
    
    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')
