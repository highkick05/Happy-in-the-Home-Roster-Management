const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');
let lines = content.split('\n');

const newRow = `                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.staff_first} {row.staff_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={\`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border \${row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}\`}>
                                 {row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP' ? 'Home Care' : 'NDIS'}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={\`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border \${noteBadgeCls}\`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelCategoryCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelRouteCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{claimableTravelCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''}</span>
                                 {row.odometer_start_photo && (
                                   <button onClick={() => window.open(row.odometer_start_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="View Start Odometer Photo">
                                     <Camera className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                               </div>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''}</span>
                                 {row.odometer_end_photo && (
                                   <button onClick={() => window.open(row.odometer_end_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="View End Odometer Photo">
                                     <Camera className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                               </div>
                             </td>`;

lines.splice(1003, 22, newRow);
fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', lines.join('\n'));
