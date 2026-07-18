const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                          {isEditing ? (
                            <input 
                              type="number" 
                              value={editOdoStart} 
                              onChange={e => setEditOdoStart(e.target.value)}
                              className="w-24 bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              placeholder="Start"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {log.odometer_start_reading !== null ? log.odometer_start_reading : '-'}
                              {log.odometer_start_photo && (
                                <button onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} className="text-brand-teal hover:text-white transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={editOdoEnd} 
                              onChange={e => setEditOdoEnd(e.target.value)}
                              className="w-24 bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              placeholder="End"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              {log.odometer_end_reading !== null ? log.odometer_end_reading : '-'}
                              {log.odometer_end_photo && (
                                <button onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} className="text-brand-teal hover:text-white transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <select 
                                value={editVehicleId}
                                onChange={e => setEditVehicleId(e.target.value)}
                                className="bg-black border border-border-subtle rounded px-2 py-1 text-xs"
                              >
                                <option value="">No Vehicle</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <button onClick={() => handleSaveOdo(log.id.toString())} className="text-green-500 hover:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setIsEditingOdo(null)} className="text-zinc-500 hover:text-zinc-400 text-xs">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs text-[#8B949E] mr-2">{log.vehicle_name ? \`(\${log.vehicle_name})\` : ''}</span>
                              <button 
                                onClick={() => {
                                  setIsEditingOdo(log.id.toString());
                                  setEditOdoStart(log.odometer_start_reading !== null ? log.odometer_start_reading.toString() : '');
                                  setEditOdoEnd(log.odometer_end_reading !== null ? log.odometer_end_reading.toString() : '');
                                  setEditVehicleId(log.vehicle_id !== null ? log.vehicle_id.toString() : '');
                                }} 
                                className="text-[#8B949E] hover:text-white transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}`;

const replacementStr = `                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              defaultValue={log.odometer_start_reading !== null ? log.odometer_start_reading : ''} 
                              onBlur={(e) => {
                                 if (e.target.value !== (log.odometer_start_reading !== null ? log.odometer_start_reading.toString() : '')) {
                                    handleInlineSave(log, { odometer_start_reading: e.target.value });
                                 }
                              }}
                              className="w-24 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                              placeholder="Start"
                            />
                            {log.odometer_start_photo && (
                              <button onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} className="text-brand-teal hover:text-white transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              defaultValue={log.odometer_end_reading !== null ? log.odometer_end_reading : ''} 
                              onBlur={(e) => {
                                 if (e.target.value !== (log.odometer_end_reading !== null ? log.odometer_end_reading.toString() : '')) {
                                    handleInlineSave(log, { odometer_end_reading: e.target.value });
                                 }
                              }}
                              className="w-24 bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                              placeholder="End"
                            />
                            {log.odometer_end_photo && (
                              <button onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} className="text-brand-teal hover:text-white transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select 
                            defaultValue={log.vehicle_id !== null ? log.vehicle_id : ''}
                            onChange={(e) => {
                               handleInlineSave(log, { vehicle_id: e.target.value });
                            }}
                            className="bg-transparent hover:bg-black focus:bg-black border border-transparent hover:border-border-subtle focus:border-brand-teal rounded px-2 py-1 text-xs transition-colors"
                          >
                            <option value="">No Vehicle</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  console.log("Replaced target str");
}

const saveFuncTarget = `  const handleSaveOdo = async (id: string) => {`;
const saveFuncReplacement = `  const handleInlineSave = async (log: any, updates: any) => {
    try {
      const payload = {
        odometer_start_reading: updates.odometer_start_reading !== undefined ? (updates.odometer_start_reading || null) : log.odometer_start_reading,
        odometer_end_reading: updates.odometer_end_reading !== undefined ? (updates.odometer_end_reading || null) : log.odometer_end_reading,
        vehicle_id: updates.vehicle_id !== undefined ? (updates.vehicle_id || null) : log.vehicle_id
      };
      
      const res = await fetch(\`/api/travel-logs/\${log.id}/odometer\`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOdo = async (id: string) => {`;

if (code.includes(saveFuncTarget)) {
  code = code.replace(saveFuncTarget, saveFuncReplacement);
  console.log("Added handleInlineSave");
}

fs.writeFileSync(file, code);
