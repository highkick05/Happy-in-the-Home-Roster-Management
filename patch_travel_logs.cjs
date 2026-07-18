const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change DatePicker positioning
code = code.replace(/position="bottom"/g, ''); // Ensure no duplicates
code = code.replace(/(<CustomDatePicker selected=\{startDate\}.*?)\/>/g, '$1 position="bottom" />');
code = code.replace(/(<CustomDatePicker selected=\{endDate\}.*?)\/>/g, '$1 position="bottom" />');

// Add "Transport KM" Header
const thTarget = '<th className="px-4 py-3 border-r border-border-subtle/30">Travel Route</th>';
const thReplacement = '<th className="px-4 py-3 border-r border-border-subtle/30">Travel Route</th>\n                  <th className="px-4 py-3 border-r border-border-subtle/30">Transport KM</th>';
code = code.replace(thTarget, thReplacement);

// Add "Transport KM" Cell
const tdTarget = '<td className="px-4 py-3 border-r border-border-subtle/30 max-w-sm truncate" title={log._route}>\n                          {log._route}\n                        </td>';
const tdReplacement = `<td className="px-4 py-3 border-r border-border-subtle/30 max-w-sm truncate" title={log._route}>
                          {log._route}
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                            {Number(log.provider_travel_km) > 0 && (
                              <span className="text-[#8B949E]">
                                PT: {Number(log.provider_travel_km).toFixed(3)} km (\${Number(log.provider_travel_cost || 0).toFixed(2)})
                              </span>
                            )}
                            {Number(log.abt_km) > 0 && (
                              <span className="text-[#8B949E]">
                                ABT: {Number(log.abt_km).toFixed(3)} km (\${Number(log.abt_cost || 0).toFixed(2)})
                              </span>
                            )}
                            {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                              <span className="text-[#E6EDF3] font-semibold mt-1">
                                Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km
                              </span>
                            ) : (
                              <span className="text-[#8B949E] italic text-xs">0 km</span>
                            )}
                          </div>
                        </td>`;
code = code.replace(tdTarget, tdReplacement);

// Adjust colSpan in loading/empty state
code = code.replace(/colSpan=\{12\}/g, 'colSpan={13}');
code = code.replace(/colSpan=\{8\}/g, 'colSpan={9}');

fs.writeFileSync(file, code);
