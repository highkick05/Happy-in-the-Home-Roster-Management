import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

# Replace table headers
target_headers = """                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Transport KM</th>
                       <th className="px-4 py-3 whitespace-nowrap">Travel Cost</th>"""
replacement_headers = """                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Category & Time</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Route</th>
                       <th className="px-4 py-3 whitespace-nowrap">Claimable Travel</th>"""

code = code.replace(target_headers, replacement_headers)

# Replace table data
target_data = """                         const hc_km = isHC ? (row.home_care_travel_km || row.provider_travel_km || 0) : 0;
                         const p_km = isHC ? 0 : (row.provider_travel_km || 0);
                         const km = p_km + hc_km + (row.abt_km || 0);
                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                         let noteStatusStr = 'Missing';
                         if (row.notes) {
                           noteBadgeCls = 'bg-brand-green/10 border-brand-green/20 text-brand-green';
                           noteStatusStr = 'Completed';
                         } else if (Math.abs(new Date().getTime() - new Date(row.end_time).getTime()) < 48 * 3600000) {
                             // within 48h
                             noteBadgeCls = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                             noteStatusStr = 'Pending Sync';
                         }
                         
                         return (
                           <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${row.funding_type === 'HOME_CARE' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}`}>
                                 {row.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${noteBadgeCls}`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">
                                {(row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP')
                                   ? '-'
                                   : "$" + ((p_km * 1.00) + ((row.abt_km || 0) * 1.00)).toFixed(2)}
                              </td>
                           </tr>
                         );"""

replacement_data = """                         const pt_km = row.provider_travel_km || 0;
                         const pt_cost = (pt_km * 1.00).toFixed(2);
                         const abt_km = row.abt_km || 0;
                         const abt_cost = (abt_km * 1.00).toFixed(2);
                         const hasPT = pt_km > 0;
                         const hasABT = abt_km > 0;
                         const isBoth = hasPT && hasABT;

                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                         let noteStatusStr = 'Missing';
                         if (row.notes) {
                           noteBadgeCls = 'bg-brand-green/10 border-brand-green/20 text-brand-green';
                           noteStatusStr = 'Completed';
                         } else if (Math.abs(new Date().getTime() - new Date(row.end_time).getTime()) < 48 * 3600000) {
                             // within 48h
                             noteBadgeCls = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                             noteStatusStr = 'Pending Sync';
                         }
                         
                         let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             travelCategoryCell = <span className="text-[#E6EDF3] text-xs">Inter-Shift Travel ({row.travel_minutes || 0} mins)</span>;
                         } else if (isBoth) {
                             travelCategoryCell = (
                                 <div className="flex flex-col gap-1 w-max">
                                     <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-blue-900/10 border-blue-900/20 text-blue-400 w-fit">Provider Travel</span>
                                     <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-teal/10 border-brand-teal/20 text-brand-teal w-fit">Activity Based Transport</span>
                                 </div>
                             );
                         } else if (hasPT) {
                             travelCategoryCell = <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-blue-900/10 border-blue-900/20 text-blue-400">Provider Travel</span>;
                         } else if (hasABT) {
                             travelCategoryCell = <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-teal/10 border-brand-teal/20 text-brand-teal">Activity Based Transport</span>;
                         }
                         
                         let travelRouteCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={`${row.origin_address || 'Unknown'} ➡️ ${row.destination_address || 'Unknown'}`}>{row.origin_address || 'Unknown'} ➡️ {row.destination_address || 'Unknown'}</div>;
                         } else if (isBoth) {
                             travelRouteCell = (
                                 <div className="flex flex-col gap-1 text-xs text-[#E6EDF3] max-w-[200px]">
                                     <div className="truncate" title={`➡️ ${row.destination_address || 'Unknown'}`}>➡️ {row.destination_address || 'Unknown'}</div>
                                     <div className="truncate" title={row.transport_route_log || 'No route logged'}>{row.transport_route_log || 'No route logged'}</div>
                                 </div>
                             );
                         } else if (hasPT) {
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={`➡️ ${row.destination_address || 'Unknown'}`}>➡️ {row.destination_address || 'Unknown'}</div>;
                         } else if (hasABT) {
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={row.transport_route_log || 'No route logged'}>{row.transport_route_log || 'No route logged'}</div>;
                         }
                         
                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             const decHrs = (row.travel_minutes || 0) / 60;
                             claimableTravelCell = <span className="font-mono text-xs text-emerald-400 tracking-tight">{decHrs.toFixed(2)} hrs</span>;
                         } else if (isBoth) {
                             claimableTravelCell = (
                                 <div className="flex flex-col gap-1 font-mono text-xs tracking-tight">
                                     <span className="text-[#E6EDF3]">PT: {pt_km} km (${pt_cost})</span>
                                     <span className="text-[#E6EDF3]">ABT: {abt_km} km (${abt_cost})</span>
                                     <span className="font-bold text-emerald-400 mt-1">Total: ${(parseFloat(pt_cost) + parseFloat(abt_cost)).toFixed(2)}</span>
                                 </div>
                             );
                         } else if (hasPT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">PT: {pt_km} km <span className="text-emerald-400">(${pt_cost})</span></span>;
                         } else if (hasABT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">ABT: {abt_km} km <span className="text-emerald-400">(${abt_cost})</span></span>;
                         }

                         return (
                           <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${row.funding_type === 'HOME_CARE' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}`}>
                                 {row.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${noteBadgeCls}`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelCategoryCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelRouteCell}</td>
                             <td className="px-4 py-2 whitespace-nowrap">{claimableTravelCell}</td>
                           </tr>
                         );"""

code = code.replace(target_data, replacement_data)

with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)

print("UI Replaced!")
