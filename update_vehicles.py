import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

start_str = "                vehicles.map(v => ("
start_idx = text.find(start_str)

if start_idx != -1:
    end_idx = text.find("                ))\n              )}", start_idx)
    if end_idx != -1:
        row_template = """                vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-brand-bg/50 transition-colors whitespace-nowrap">
                    <td className="px-3 py-2 border-r border-border-subtle/30 group">
                      <div className="flex items-center gap-2">
                         <div className="font-medium text-white w-32"><InlineInput value={v.name} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, name: val} : x))} onBlur={() => handleUpdateRow(v.id, {name: v.name})} placeholder="Make & Model" /></div>
                         <div className="text-xs text-[#8B949E] w-12"><InlineInput value={v.year} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, year: val} : x))} onBlur={() => handleUpdateRow(v.id, {year: v.year})} placeholder="Year" /></div>
                         <div className="text-xs text-[#8B949E] uppercase tracking-wider w-20"><InlineInput value={v.rego} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, rego: val} : x))} onBlur={() => handleUpdateRow(v.id, {rego: v.rego})} placeholder="Rego" className="uppercase" /></div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 text-center align-middle">
                       {(user?.role === 'ADMIN' || v.user_id === user?.id) ? (
                          <button onClick={() => handleSetPrimary(v)} className="text-brand-teal hover:text-white transition-colors" title="Set as default vehicle">
                            {v.is_primary ? <CheckCircle2 className="w-4 h-4 mx-auto text-brand-teal" /> : <Circle className="w-4 h-4 mx-auto text-[#8B949E]" />}
                          </button>
                       ) : (
                          v.is_primary ? <CheckCircle2 className="w-4 h-4 mx-auto text-brand-teal" /> : <Circle className="w-4 h-4 mx-auto text-[#8B949E]" />
                       )}
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 font-medium group relative align-middle">
                         {user?.role === 'ADMIN' ? (
                            <select value={v.ownership === 'COMPANY' ? '' : (v.user_id || '')} onChange={e => {
                               const uid = e.target.value;
                               const newOwnership = uid ? 'PRIVATE' : 'COMPANY';
                               handleUpdateRow(v.id, { user_id: uid, ownership: newOwnership });
                            }} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:border-border-subtle focus:ring-1 focus:ring-brand-teal rounded appearance-none text-[#8B949E] text-sm">
                              <option value="">Company</option>
                              {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                         ) : (
                            <span className="text-sm text-[#8B949E]">
                              {v.ownership === 'COMPANY' ? 'Company' : (v.user_id === user?.id ? 'Me' : 'Staff')}
                            </span>
                         )}
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 align-middle">
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
                    <td className="px-3 py-2 border-r border-border-subtle/30 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <CustomDatePicker position="bottom" value={v.rego_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {rego_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm" />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
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
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <select value={v.insurance_type || ''} onChange={e => handleUpdateRow(v.id, {insurance_type: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] appearance-none text-sm">
                              <option value="THIRD_PARTY">3rd Party</option>
                              <option value="COMPREHENSIVE">Comp.</option>
                            </select>
                          </div>
                          <div className="w-20">
                            <InlineInput value={v.insurance_provider} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, insurance_provider: val} : x))} onBlur={() => handleUpdateRow(v.id, {insurance_provider: v.insurance_provider})} placeholder="Provider" className="text-xs text-[#8B949E] uppercase tracking-wider" />
                          </div>
                        </div>
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <CustomDatePicker position="bottom" value={v.insurance_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {insurance_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm" />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
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
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 text-center align-middle">
                        <button onClick={() => handleUpdateRow(v.id, {has_roadside: !v.has_roadside})} className="inline-flex px-2 py-1 rounded text-xs font-bold tracking-wide uppercase border bg-transparent hover:bg-white/5 border-border-subtle text-white transition-colors" title="Toggle Roadside">
                          {v.has_roadside ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>}
                        </button>
                    </td>
                    <td className="px-3 py-2 border-r border-border-subtle/30 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <CustomDatePicker position="bottom" value={v.roadside_expiry || ''} onChange={(e: any) => handleUpdateRow(v.id, {roadside_expiry: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm" />
                          </div>
                          <div className="w-20">
                            <InlineInput value={v.roadside_provider} onChange={(val: string) => setVehicles(prev => prev.map(x => x.id === v.id ? {...x, roadside_provider: val} : x))} onBlur={() => handleUpdateRow(v.id, {roadside_provider: v.roadside_provider})} placeholder="Provider" className="text-xs text-[#8B949E] uppercase tracking-wider" />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
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
                        </div>
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
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
"""
        text = text[:start_idx] + row_template + text[end_idx:]

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)

