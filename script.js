import fs from 'fs';
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const hrsOrig = '                         let hrs = 0;\n                         if (row.actual_start_time && row.actual_finish_time) {\n                           hrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;\n                         } else if (row.start_time && row.end_time) {\n                           hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;\n                         }';

const hrsNew = '                         let hrs = 0;\n                         let qtyOverride = null;\n                         try {\n                           if (row.services_json) {\n                             const srvList = JSON.parse(row.services_json);\n                             if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== \'\') {\n                               qtyOverride = parseFloat(srvList[0].qtyOverride);\n                             }\n                           }\n                         } catch (e) {}\n\n                         if (qtyOverride !== null && !isNaN(qtyOverride)) {\n                           hrs = qtyOverride;\n                         } else {\n                           if (row.actual_start_time && row.actual_finish_time) {\n                             const aHrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;\n                             if (aHrs > 0) {\n                               hrs = aHrs;\n                             } else {\n                               hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;\n                             }\n                           } else if (row.start_time && row.end_time) {\n                             hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;\n                           }\n                         }';

content = content.split(hrsOrig).join(hrsNew);

const travelCostOrig = '<td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">${km.toFixed(2)}</td>';
const travelCostNew = `<td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">
                                {(row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP') 
                                  ? '-' 
                                  : \\\`$\\\${((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)}\\\`}
                              </td>`;

content = content.split(travelCostOrig).join(travelCostNew);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
console.log('Update complete');
