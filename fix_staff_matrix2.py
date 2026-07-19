import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = re.sub(
        r'\{/\* Staff Header Row \*/\}.*?<div className="flex items-center gap-3">',
        """{/* Staff Header Row */}
                        <div 
                          onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                          className="flex items-center justify-between px-4 py-2 cursor-pointer select-none gap-4"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-[#E6EDF3] font-medium text-[13px] whitespace-nowrap flex items-center gap-1.5 shrink-0">
                              <span>{staff.first_name} {staff.last_name}</span>
                              <span className="text-[11px] text-[#8B949E] font-normal">({staff.email})</span>
                            </div>
                            <div className="text-[11px] text-[#8B949E] flex items-center gap-2 border-l border-white/10 pl-3 m-0 whitespace-nowrap overflow-hidden text-ellipsis">
                              <span>Compliance Stats: <strong className="text-[#E6EDF3] font-medium">{stats.totalUploaded} of {Object.keys(ONBOARDING_STEP_LABELS).length}</strong> items uploaded</span>
                              <span>•</span>
                              <span>Missing: <strong className="text-[#E6EDF3] font-medium">{stats.missing}</strong> items</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">""",
        text,
        flags=re.DOTALL
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/components/Compliance/ComplianceDashboard.tsx')
