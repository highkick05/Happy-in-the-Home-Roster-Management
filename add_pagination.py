import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

target_states = """  // States for Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);"""

replacement_states = """  // States for Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Pagination states
  const [evidencePage, setEvidencePage] = useState(1);
  const [evidencePageSize, setEvidencePageSize] = useState(50);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(50);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(50);
"""
if "const [evidencePage" not in code:
    code = code.replace(target_states, replacement_states)

def get_pagination_ui(page_var, size_var, data_len_var, set_page_func, set_size_func):
    return """
        <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-bg/50">
            <div className="text-sm text-[#8B949E]">
                Showing {Math.min((""" + page_var + """ - 1) * """ + size_var + """ + (""" + data_len_var + """ > 0 ? 1 : 0), """ + data_len_var + """)} to {Math.min(""" + page_var + """ * """ + size_var + """, """ + data_len_var + """)} of {""" + data_len_var + """} entries
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#8B949E]">Rows per page:</span>
                    <select
                        value={""" + size_var + """}
                        onChange={(e) => {""" + set_size_func + """(Number(e.target.value)); """ + set_page_func + """(1);}}
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
                        onClick={() => """ + set_page_func + """(Math.max(1, """ + page_var + """ - 1))}
                        disabled={""" + page_var + """ === 1}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &lt;
                    </button>
                    <span className="text-sm text-[#E6EDF3] px-2">{""" + page_var + """} / {Math.ceil(""" + data_len_var + """ / """ + size_var + """) || 1}</span>
                    <button
                        onClick={() => """ + set_page_func + """(Math.min(Math.ceil(""" + data_len_var + """ / """ + size_var + """), """ + page_var + """ + 1))}
                        disabled={""" + page_var + """ >= Math.ceil(""" + data_len_var + """ / """ + size_var + """)}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </div>
"""

# Evidence slice
code = code.replace(
    "evidenceMatrix.map((item, idx)", 
    "evidenceMatrix.slice((evidencePage - 1) * evidencePageSize, evidencePage * evidencePageSize).map((item, idx)"
)
# Staff slice
code = code.replace(
    "staffMatrix.map((item, idx)", 
    "staffMatrix.slice((staffPage - 1) * staffPageSize, staffPage * staffPageSize).map((item, idx)"
)
# Logs slice
code = code.replace(
    "auditLogs.map((log, i)", 
    "auditLogs.slice((logsPage - 1) * logsPageSize, logsPage * logsPageSize).map((log, i)"
)

# Add pagination UI to Evidence Pack
evidence_target = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No evidence matching selected criteria.
            </div>
          )}
        </div>
      )}"""
evidence_replacement = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No evidence matching selected criteria.
            </div>
          )}
        </div>
""" + get_pagination_ui('evidencePage', 'evidencePageSize', 'evidenceMatrix.length', 'setEvidencePage', 'setEvidencePageSize') + """
      )}"""
code = code.replace(evidence_target, evidence_replacement)

# Add pagination UI to Staff Logbook
staff_target = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No logbook entries matching selected criteria.
            </div>
          )}
        </div>
      )}"""
staff_replacement = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No logbook entries matching selected criteria.
            </div>
          )}
        </div>
""" + get_pagination_ui('staffPage', 'staffPageSize', 'staffMatrix.length', 'setStaffPage', 'setStaffPageSize') + """
      )}"""
code = code.replace(staff_target, staff_replacement)

# Add pagination UI to Audit Logs
logs_target = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No immutable log entries found.
            </div>
          )}
        </div>
      </div>
      )}"""
logs_replacement = """              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No immutable log entries found.
            </div>
          )}
        </div>
""" + get_pagination_ui('logsPage', 'logsPageSize', 'auditLogs.length', 'setLogsPage', 'setLogsPageSize') + """
      </div>
      )}"""
code = code.replace(logs_target, logs_replacement)


with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)

print("Pagination added")
