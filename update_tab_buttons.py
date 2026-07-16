import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

target = """        <button
          onClick={() => setActiveTab('mandatory_documents')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ${activeTab === 'mandatory_documents' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Mandatory Documents
        </button>
      </div>"""
replacement = """        <button
          onClick={() => setActiveTab('mandatory_documents')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ${activeTab === 'mandatory_documents' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Mandatory Documents
        </button>
        <button
          onClick={() => setActiveTab('system_logs')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ml-auto ${activeTab === 'system_logs' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <Search className="w-4 h-4 mr-2" /> Immutable System Logs
        </button>
      </div>"""
code = code.replace(target, replacement)

target2 = """      {/* System Audit Logs Visualizer */}
      <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-x-auto mt-8">"""
replacement2 = """      {/* System Audit Logs Visualizer */}
      {activeTab === 'system_logs' && (
      <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-x-auto">"""
code = code.replace(target2, replacement2)

target3 = """                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No immutable log entries found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}"""
replacement3 = """                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#8B949E] text-sm">
              No immutable log entries found.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}"""
code = code.replace(target3, replacement3)

with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)

