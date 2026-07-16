import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

# I need to add the pagination for audit logs, and close the system logs tab.
target = """               <div className="flex items-center justify-center p-8">                 <p className="text-[#8B949E] text-sm">No manual modifications found for completed records.</p>               </div>             )}           </div>        </div>      </div>      {/* Manage Staff Documents Modal */}"""

# We need to insert pagination and the closing brace
pagination = """
        <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-bg/50">
            <div className="text-sm text-[#8B949E]">
                Showing {Math.min((logsPage - 1) * logsPageSize + (auditLogs.length > 0 ? 1 : 0), auditLogs.length)} to {Math.min(logsPage * logsPageSize, auditLogs.length)} of {auditLogs.length} entries
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#8B949E]">Rows per page:</span>
                    <select
                        value={logsPageSize}
                        onChange={(e) => {setLogsPageSize(Number(e.target.value)); setLogsPage(1);}}
                        className="bg-brand-navy border border-border-subtle rounded px-2 py-1 text-sm text-[#E6EDF3] outline-none"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                    </select>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                        disabled={logsPage === 1}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &lt;
                    </button>
                    <span className="text-sm text-[#E6EDF3] px-2">{logsPage} / {Math.ceil(auditLogs.length / logsPageSize) || 1}</span>
                    <button
                        onClick={() => setLogsPage(Math.min(Math.ceil(auditLogs.length / logsPageSize), logsPage + 1))}
                        disabled={logsPage >= Math.ceil(auditLogs.length / logsPageSize)}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </div>
"""

replacement = """               <div className="flex items-center justify-center p-8">                 <p className="text-[#8B949E] text-sm">No manual modifications found for completed records.</p>               </div>             )}           </div>""" + pagination + """        </div>      </div>      )}      {/* Manage Staff Documents Modal */}"""

# We need to do whitespace-insensitive replace
import re
target_regex = r'<\s*div\s+className="flex items-center justify-center p-8"\s*>\s*<\s*p\s+className="text-\[#8B949E\] text-sm"\s*>\s*No manual modifications found for completed records\.\s*</p>\s*</div>\s*\)}\s*</div>\s*</div>\s*</div>\s*\{\/\*\s*Manage Staff Documents Modal\s*\*\/\s*\}'

replacement_str = """               <div className="flex items-center justify-center p-8">                 <p className="text-[#8B949E] text-sm">No manual modifications found for completed records.</p>               </div>             )}           </div>""" + pagination + """        </div>      </div>      )}      {/* Manage Staff Documents Modal */}"""

code = re.sub(target_regex, replacement_str, code)

with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)

print("Fixed")
