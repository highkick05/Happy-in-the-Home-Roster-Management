const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const oldHeaders = `<th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Staff Name</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Service Date</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Shift Timestamps</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Client</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Logged Hrs</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Transport KM</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Start Odometer</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">End Odometer</th>
                       <th className="px-4 py-3 whitespace-nowrap">Travel Cost</th>`;

const newHeaders = `<th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Staff Name</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Service Date</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Shift Timestamps</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Care Type</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Client</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Logged Hrs</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Category & Time</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Route</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Claimable Travel</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Transport KM</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Start Odometer</th>
                       <th className="px-4 py-3 whitespace-nowrap">End Odometer</th>`;

content = content.replace(oldHeaders, newHeaders);

const oldRow = `<td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.staff_first} {row.staff_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={\`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border \${noteBadgeCls}\`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
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

const newRow = `<td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.staff_first} {row.staff_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={\`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border \${row.funding_type === 'HOME_CARE' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}\`}>
                                 {row.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
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
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs cursor-pointer hover:bg-white/5" onClick={() => row.odometer_start_photo ? window.open(row.odometer_start_photo, '_blank') : null}>
                               {row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''} {row.odometer_start_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs cursor-pointer hover:bg-white/5" onClick={() => row.odometer_end_photo ? window.open(row.odometer_end_photo, '_blank') : null}>
                               {row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''} {row.odometer_end_photo ? '📸' : ''}
                             </td>`;

content = content.replace(oldRow, newRow);

const cellLogicMatch = content.match(/const pt_km = row\.provider_travel_km \|\| 0;[\s\S]+?let claimableTravelCell = [^;]+;[\s\S]+?} else if \(hasABT\) {[\s\S]+?}/);
if (cellLogicMatch) {
    const cellLogic = cellLogicMatch[0];
    const staffInjectPoint = /let noteBadgeCls = 'bg-slate-500\/10 border-slate-500\/20 text-slate-400';\s*let noteStatusStr = 'Missing';/;
    if (content.match(staffInjectPoint)) {
        // Only inject once to avoid duplicate variable names, wait, in the same file `cellLogic` has variables defined like `const pt_km = row.provider_travel_km || 0;` which are already defined for staff matrix or not?
        // Wait, for staffMatrix we have: `const p_km = isHC ? 0 : (row.provider_travel_km || 0);`
        // We can just inject the exact same logic. But we should remove the duplicate `const isHC` declaration if it's there.
        // Let's just redefine them using `let` or inside an IIFE if needed, or simply let React block scope them since they are inside the `map` callback.
        content = content.replace(staffInjectPoint, `\n${cellLogic}\n                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';\n                         let noteStatusStr = 'Missing';`);
        
        // Let's remove duplicate `const isHC =` declaration if we just injected one
        content = content.replace(/const isHC = \(row\.funding_type === 'HOME_CARE' \|\| row\.funding_type === 'Home Care' \|\| row\.funding_type === 'HCP'\);\n                         const hc_km = isHC \? \(row\.home_care_travel_km \|\| row\.provider_travel_km \|\| 0\) : 0;\n                         const p_km = isHC \? 0 : \(row\.provider_travel_km \|\| 0\);\n                         const km = p_km \+ hc_km \+ \(row\.abt_km \|\| 0\);/,
                                  `const hc_km = isHC ? (row.home_care_travel_km || row.provider_travel_km || 0) : 0;\n                         const p_km = isHC ? 0 : (row.provider_travel_km || 0);\n                         const km = p_km + hc_km + (row.abt_km || 0);`);

        fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
        console.log("Patched successfully!");
    } else {
        console.log("Could not find staff inject point");
    }
}

