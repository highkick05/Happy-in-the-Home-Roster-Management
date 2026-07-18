const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Calculate totals
const addTotalsLogic = `
  const totalPTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_km) || 0), 0);
  const totalPTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_cost) || 0), 0);
  const totalABTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_km) || 0), 0);
  const totalABTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_cost) || 0), 0);
  const grandTotalKm = totalPTKm + totalABTKm;
  const grandTotalCost = totalPTCost + totalABTCost;

  return (
`;
code = code.replace(/return \(\s*<div className="p-6">/g, addTotalsLogic + '<div className="p-6">');

// Add TFoot
const tfootStr = `
              <tfoot className="bg-brand-navy border-t-2 border-border-subtle font-semibold">
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 6 : 5} className="px-4 py-3 text-right text-[#E6EDF3] border-r border-border-subtle/30">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                    <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                      {totalPTKm > 0 && (
                        <span className="text-[#8B949E]">
                          PT: {totalPTKm.toFixed(3)} km (\${totalPTCost.toFixed(2)})
                        </span>
                      )}
                      {totalABTKm > 0 && (
                        <span className="text-[#8B949E]">
                          ABT: {totalABTKm.toFixed(3)} km (\${totalABTCost.toFixed(2)})
                        </span>
                      )}
                      <span className="text-brand-teal font-bold mt-1 border-t border-border-subtle/50 pt-1">
                        Total: {grandTotalKm.toFixed(3)} km (\${grandTotalCost.toFixed(2)})
                      </span>
                    </div>
                  </td>
                  <td colSpan={3} className="px-4 py-3 border-r border-border-subtle/30"></td>
                </tr>
              </tfoot>
            </table>
`;
code = code.replace(/<\/tbody>\s*<\/table>/g, '</tbody>' + tfootStr);

fs.writeFileSync(file, code);
