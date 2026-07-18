const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacement = `              </tbody>
              <tfoot className="bg-brand-navy border-t-2 border-border-subtle font-semibold">
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 6 : 5} className="px-4 py-3 text-right text-[#E6EDF3] border-r border-border-subtle/30">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                    <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                      {totalPTKm > 0 && (
                        <span className="text-[#8B949E]">
                          PT: {totalPTKm.toFixed(3)} km (\${totalPTCost.toFixed(2)})
                        </span>
                      )}
                      {totalABTKm > 0 && (
                        <span className="text-[#8B949E]">
                          ABT: {totalABTKm.toFixed(3)} km (\${totalABTCost.toFixed(2)})
                        </span>
                      )}
                      <span className="text-brand-teal font-bold mt-1 border-t border-border-subtle/50 pt-1">
                        Total: {grandTotalKm.toFixed(3)} km (\${grandTotalCost.toFixed(2)})
                      </span>
                    </div>
                  </td>
                  <td colSpan={3} className="px-4 py-3 border-r border-border-subtle/30"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {expandedLogs.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-navy">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8B949E]">
                  Showing {Math.min((page - 1) * pageSize + 1, expandedLogs.length)} to {Math.min(page * pageSize, expandedLogs.length)} of {expandedLogs.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#8B949E]">Show</span>
                  <select 
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-black border border-border-subtle rounded px-2 py-1 text-sm text-[#E6EDF3] outline-none focus:border-brand-teal"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-brand-navy border border-border-subtle text-[#E6EDF3] rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(expandedLogs.length / pageSize), p + 1))}
                  disabled={page === Math.ceil(expandedLogs.length / pageSize)}
                  className="px-3 py-1 bg-brand-navy border border-border-subtle text-[#E6EDF3] rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {showVehicles && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowVehicles(false)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">Vehicle Register</h3>
              <button onClick={() => setShowVehicles(false)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-6">
              {user?.role === 'ADMIN' && (
                <div className="flex items-end gap-4 mb-6 p-4 border border-border-subtle rounded-lg bg-black/30">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Vehicle Make & Model</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Toyota Corolla"
                      value={newVehicle.name}
                      onChange={e => setNewVehicle({...newVehicle, name: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Registration</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1ABC123"
                      value={newVehicle.rego}
                      onChange={e => setNewVehicle({...newVehicle, rego: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-[#8B949E] mb-1 uppercase tracking-wider">Owner (Staff)</label>
                    <select
                      value={newVehicle.user_id}
                      onChange={e => setNewVehicle({...newVehicle, user_id: e.target.value})}
                      className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-[#E6EDF3] focus:border-brand-teal outline-none"
                    >
                      <option value="">Select Staff</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={handleAddVehicle}
                    className="h-[38px] px-4 bg-brand-teal hover:bg-teal-600 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vehicle
                  </button>
                </div>
              )}

              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-brand-navy border-b border-border-subtle text-xs uppercase text-[#8B949E]">
                    <tr>
                      <th className="px-4 py-2 border-r border-border-subtle/30">Vehicle</th>
                      <th className="px-4 py-2 border-r border-border-subtle/30">Rego</th>
                      {user?.role === 'ADMIN' && <th className="px-4 py-2 border-r border-border-subtle/30">Owner</th>}
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-brand-navy/30">
                    {vehicles.length === 0 ? (
                      <tr><td colSpan={user?.role === 'ADMIN' ? 4 : 3} className="px-4 py-8 text-center text-[#8B949E] text-sm">No vehicles registered yet.</td></tr>
                    ) : vehicles.map(v => (
                      <tr key={v.id}>
                        <td className="px-4 py-3 text-sm text-white font-medium border-r border-border-subtle/30">{v.name}</td>
                        <td className="px-4 py-3 text-sm text-[#E6EDF3] border-r border-border-subtle/30">{v.rego}</td>
                        {user?.role === 'ADMIN' && (
                          <td className="px-4 py-3 text-sm text-[#8B949E] border-r border-border-subtle/30">
                            {staff.find(s => s.id === v.user_id)?.first_name} {staff.find(s => s.id === v.user_id)?.last_name}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteVehicle(v.id.toString())} className="text-red-500 hover:text-red-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}`;

const startIndex = code.indexOf('</tbody></table></div></div></div>');
const endIndex = code.indexOf('{/* Photo Preview Modal */}');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex + '{/* Photo Preview Modal */}'.length);
  fs.writeFileSync(file, code);
  console.log('Success');
} else {
  console.log('Not found');
}
