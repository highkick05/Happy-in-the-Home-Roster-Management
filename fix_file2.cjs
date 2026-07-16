const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const regex = /const pt_km = row\.provider_travel_km \|\| 0;[\s\S]+?(?=let noteBadgeCls = 'bg-slate-500\/10 border-slate-500\/20 text-slate-400';)/;
// Wait, the regex will match everything until the FIRST `let noteBadgeCls`!

const correctCellLogic = `const pt_km = row.provider_travel_km || 0;
                         const pt_cost = (pt_km * 1.00).toFixed(2);
                         const abt_km = row.abt_km || 0;
                         const abt_cost = (abt_km * 1.00).toFixed(2);
                         const hasPT = pt_km > 0;
                         const hasABT = abt_km > 0;
                         const isBoth = hasPT && hasABT;

                         let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             let actualDriveMins = 0;
                             if (row.transport_route_log) {
                                try {
                                   const tLog = JSON.parse(row.transport_route_log);
                                   if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.minutes !== undefined) {
                                      actualDriveMins = tLog.homeCareTravel.minutes;
                                   } else if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.legs) {
                                      actualDriveMins = tLog.homeCareTravel.legs.reduce((sum: number, l: any) => sum + (l.durationMins || 0), 0);
                                   }
                                } catch(e) {}
                             }
                             if (actualDriveMins <= 0 && row.provider_travel_minutes) {
                                actualDriveMins = row.provider_travel_minutes;
                             }
                             if (actualDriveMins < 0) actualDriveMins = 0;
                             travelCategoryCell = <span className="text-[#E6EDF3] text-xs font-medium">Inter-Shift Travel ({Math.round(actualDriveMins)} mins)</span>;
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
                             const hcRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log, row) : \`\${row.origin_address || 'Unknown'} ➡️ \${row.destination_address || 'Unknown'}\`;
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={hcRoute || 'No route logged'}>{hcRoute || 'No route logged'}</div>;
                         } else if (isBoth) {
                             const fullRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log, row) : \`\${row.origin_address || 'Unknown'} ➡️ \${row.destination_address || 'Unknown'}\`;
                             const routes = (fullRoute || 'No route logged').split(' ; ');
                             travelRouteCell = (
                                 <div className="flex flex-col gap-1 text-xs text-[#E6EDF3] max-w-[200px]">
                                     {routes.map((r, i) => <div key={i} className="truncate" title={r}>{r}</div>)}
                                 </div>
                             );
                         } else if (hasPT) {
                             const ptRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log, row) : \`\${row.origin_address || 'Unknown'} ➡️ \${row.destination_address || 'Unknown'}\`;
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={ptRoute || 'No route logged'}>{ptRoute || 'No route logged'}</div>;
                         } else if (hasABT) {
                             const abtRoute = formatRouteLog(row.transport_route_log, row);
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={abtRoute || 'No route logged'}>{abtRoute || 'No route logged'}</div>;
                         }
                         
                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             let actualDriveMins = 0;
                             if (row.transport_route_log) {
                                try {
                                   const tLog = JSON.parse(row.transport_route_log);
                                   if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.minutes !== undefined) {
                                      actualDriveMins = tLog.homeCareTravel.minutes;
                                   } else if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.legs) {
                                      actualDriveMins = tLog.homeCareTravel.legs.reduce((sum: number, l: any) => sum + (l.durationMins || 0), 0);
                                   }
                                } catch(e) {}
                             }
                             if (actualDriveMins <= 0 && row.provider_travel_minutes) {
                                actualDriveMins = row.provider_travel_minutes;
                             }
                             if (actualDriveMins < 0) actualDriveMins = 0;
                             const decHrs = actualDriveMins / 60;
                             claimableTravelCell = <span className="font-mono text-xs text-emerald-400 tracking-tight">{decHrs.toFixed(2)} hrs</span>;
                         } else if (isBoth) {
                             claimableTravelCell = (
                                 <div className="flex flex-col gap-1 font-mono text-xs tracking-tight">
                                     <span className="text-[#E6EDF3]">PT: {pt_km} km (\${pt_cost})</span>
                                     <span className="text-[#E6EDF3]">ABT: {abt_km} km (\${abt_cost})</span>
                                     <span className="font-bold text-emerald-400 mt-1">Total: $(\${(parseFloat(pt_cost) + parseFloat(abt_cost)).toFixed(2)})</span>
                                 </div>
                             );
                         } else if (hasPT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">PT: {pt_km} km <span className="text-emerald-400">(\${pt_cost})</span></span>;
                         } else if (hasABT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">ABT: {abt_km} km <span className="text-emerald-400">(\${abt_cost})</span></span>;
                         }
                         `;

// We have two places where this cell logic exists. One for clientMatrix, one for staffMatrix.
// Let's replace the first one.
let replacedFirst = content.replace(regex, correctCellLogic);
// Then the second one.
let replacedSecond = replacedFirst.replace(regex, correctCellLogic);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', replacedSecond);
