import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# First replace the handleFileUploadRow editingRowId check
# Replace:
# if (editingRowId === vehicleId) {
#   setEditVehicleData({ ...editVehicleData, [field]: data.system_name });
# } else {
#   await fetch(...
old_upload_check = """        if (editingRowId === vehicleId) {
          setEditVehicleData({ ...editVehicleData, [field]: data.system_name });
        } else {
          await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...originalVehicle, [field]: data.system_name })
          });
          fetchVehicles();
        }"""

new_upload_check = """        await fetch(`/api/vehicles/${vehicleId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...originalVehicle, [field]: data.system_name })
        });
        fetchVehicles();"""

text = text.replace(old_upload_check, new_upload_check)


start_str = "                vehicles.map(v => {"
# The end is where the `</tbody>` is. Let's find the first `</tbody>` after `vehicles.map(v => {`.
start_idx = text.find(start_str)
if start_idx != -1:
    end_idx = text.find("</tbody>", start_idx)
    if end_idx != -1:
        row_template = """                vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-brand-bg/50 transition-colors">
                    <td className="px-3 py-3 border-r border-border-subtle/30 group">
                      <div className="font-medium text-white w-full">
                         <InlineInput value={v.name} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, name: val} : x))} onBlur={() => handleUpdateRow(v.id, {name: v.name})} placeholder="Make & Model" />
                      </div>
                      <div className="text-xs text-[#8B949E] flex items-center gap-2 mt-0.5">
                        <span className="w-12"><InlineInput value={v.year} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, year: val} : x))} onBlur={() => handleUpdateRow(v.id, {year: v.year})} placeholder="Year" /></span>
                        <span className="w-1 h-1 rounded-full bg-[#8B949E]/50 flex-shrink-0"></span>
                        <span className="uppercase tracking-wider w-24"><InlineInput value={v.rego} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, rego: val} : x))} onBlur={() => handleUpdateRow(v.id, {rego: v.rego})} placeholder="Rego" className="uppercase" /></span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30 text-center">
                       {(user?.role === 'ADMIN' || v.user_id === user?.id) ? (
                          <button onClick={() => handleSetPrimary(v)} className="text-brand-teal hover:text-white transition-colors" title="Set as default vehicle">
                            {v.is_primary ? <CheckCircle2 className="w-5 h-5 mx-auto text-brand-teal" /> : <Circle className="w-5 h-5 mx-auto text-[#8B949E]" />}
                          </button>
                       ) : (
                          v.is_primary ? <CheckCircle2 className="w-5 h-5 mx-auto text-brand-teal" /> : <Circle className="w-5 h-5 mx-auto text-[#8B949E]" />
                       )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30 font-medium group relative">
                         {user?.role === 'ADMIN' ? (
                            <select value={v.ownership === 'COMPANY' ? '' : (v.user_id || '')} onChange={e => {
                               const uid = e.target.value;
                               const newOwnership = uid ? 'PRIVATE' : 'COMPANY';
                               handleUpdateRow(v.id, { user_id: uid, ownership: newOwnership });
                            }} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:border-border-subtle focus:ring-1 focus:ring-brand-teal rounded appearance-none text-[#8B949E]">
                              <option value="">Company</option>
                              {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                         ) : (
                            <span className="text-xs text-[#8B949E]">
                              {v.ownership === 'COMPANY' ? 'Company' : (v.user_id === user?.id ? 'Me' : 'Staff')}
                            </span>
                         )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                        {user?.role === 'ADMIN' ? (
                          <select value={v.ownership || 'COMPANY'} onChange={e => handleUpdateRow(v.id, { ownership: e.target.value })} className={`inline-flex px-1 py-1 rounded text-xs font-bold tracking-wide uppercase border outline-none cursor-pointer appearance-none ${v.ownership === 'COMPANY' ? 'bg-blue-900/10 border-blue-900/20 text-blue-400' : 'bg-purple-900/10 border-purple-900/20 text-purple-400'}`}>
                            <option value="COMPANY">Company</option>
                            <option value="PRIVATE">Private</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold tracking-wide uppercase border ${v.ownership === 'COMPANY' ? 'bg-blue-900/10 border-blue-900/20 text-blue-400' : 'bg-purple-900/10 border-purple-900/20 text-purple-400'}`}>
                            {v.ownership === 'COMPANY' ? 'Company' : 'Private'}
                          </span>
                        )}
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      <CustomDatePicker position="bottom" value={v.rego_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {rego_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E]" />
                      <div className="flex items-center gap-2 mt-1">
                        {v.rego_evidence_url && (
                          <a href={`/uploads/${v.rego_evidence_url}`} download className="text-brand-teal hover:text-teal-400" title="View Document">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        <label className="cursor-pointer text-[#8B949E] hover:text-white" title="Upload Document">
                          <Upload className="w-4 h-4" />
                          <input type="file" className="hidden" onChange={(e) => handleFileUploadRow(e, v.id, 'rego_evidence_url')} />
                        </label>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                        <div className="space-y-1">
                          <select value={v.insurance_type || ''} onChange={e => handleUpdateRow(v.id, {insurance_type: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] appearance-none">
                            <option value="THIRD_PARTY">3rd Party</option>
                            <option value="COMPREHENSIVE">Comp.</option>
                          </select>
                          <InlineInput value={v.insurance_provider} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, insurance_provider: val} : x))} onBlur={() => handleUpdateRow(v.id, {insurance_provider: v.insurance_provider})} placeholder="Provider" className="text-[10px] text-[#8B949E] uppercase tracking-wider h-5" />
                        </div>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                      <CustomDatePicker position="bottom" value={v.insurance_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {insurance_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E]" />
                      <div className="flex items-center gap-2 mt-1">
                        {v.insurance_evidence_url && (
                          <a href={`/uploads/${v.insurance_evidence_url}`} download className="text-brand-teal hover:text-teal-400" title="View Document">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        <label className="cursor-pointer text-[#8B949E] hover:text-white" title="Upload Document">
                          <Upload className="w-4 h-4" />
                          <input type="file" className="hidden" onChange={(e) => handleFileUploadRow(e, v.id, 'insurance_evidence_url')} />
                        </label>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30 text-center">
                        <button onClick={() => handleUpdateRow(v.id, {has_roadside: !v.has_roadside})} className="inline-flex px-2 py-1 rounded text-sm font-bold tracking-wide uppercase border bg-transparent hover:bg-white/5 border-border-subtle text-white transition-colors" title="Toggle Roadside">
                          {v.has_roadside ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>}
                        </button>
                    </td>
                    <td className="px-3 py-3 border-r border-border-subtle/30">
                        <div className="space-y-1">
                          <CustomDatePicker position="bottom" value={v.roadside_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {roadside_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E]" />
                          <InlineInput value={v.roadside_provider} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, roadside_provider: val} : x))} onBlur={() => handleUpdateRow(v.id, {roadside_provider: v.roadside_provider})} placeholder="Provider" className="text-[10px] text-[#8B949E] uppercase tracking-wider h-5" />
                        </div>
                      <div className="flex items-center gap-2 mt-1">
                        {v.roadside_evidence_url && (
                          <a href={`/uploads/${v.roadside_evidence_url}`} download className="text-brand-teal hover:text-teal-400" title="View Document">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        <label className="cursor-pointer text-[#8B949E] hover:text-white" title="Upload Document">
                          <Upload className="w-4 h-4" />
                          <input type="file" className="hidden" onChange={(e) => handleFileUploadRow(e, v.id, 'roadside_evidence_url')} />
                        </label>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(v)} className="text-brand-teal hover:text-white p-1" title="Edit via Form">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user?.role === 'ADMIN' && (
                            <button onClick={() => handleDeleteVehicle(v.id.toString())} className="text-red-500 hover:text-red-400 p-1" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            """
        text = text[:start_idx] + row_template + text[end_idx:]

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)

