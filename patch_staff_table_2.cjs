const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

// 1. Add Care Type
content = content.replace(
    `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>`,
    `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={\`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border \${row.funding_type === 'HOME_CARE' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}\`}>
                                 {row.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
                               </span>
                             </td>`
);

// 2. Add Travel Category & Time, Travel Route, Claimable Travel, and remove Travel Cost.
// The string to replace is from <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap"> {noteStatusStr} </td> to the end of the row.
const startSearch = `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>`;
const endSearch = `</td`;

const toReplace = `                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               {row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''} {row.odometer_start_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               {row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''} {row.odometer_end_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">
                                {(row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP')
                                   ? '-'
                                   : "$" + ((p_km * 1.00) + ((row.abt_km || 0) * 1.00)).toFixed(2)}
                              </td>`;

const replacement = `                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelCategoryCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelRouteCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{claimableTravelCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs cursor-pointer hover:bg-white/5" onClick={() => row.odometer_start_photo ? window.open(row.odometer_start_photo, '_blank') : null}>
                               {row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''} {row.odometer_start_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs cursor-pointer hover:bg-white/5" onClick={() => row.odometer_end_photo ? window.open(row.odometer_end_photo, '_blank') : null}>
                               {row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''} {row.odometer_end_photo ? '📸' : ''}
                             </td>`;

content = content.replace(toReplace, replacement);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
