const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldCell = `<td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                            {log._category}
                          </span>
                        </td>`;

const newCell = `<td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          {log._category === 'Provider Travel & Activity Based Transport' ? (
                            <div className="flex flex-col gap-1 w-fit">
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                                Provider Travel
                              </span>
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                                Activity Based Transport
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                              {log._category}
                            </span>
                          )}
                        </td>`;

if (code.includes(oldCell)) {
    code = code.replace(oldCell, newCell);
    fs.writeFileSync(file, code);
    console.log("Success");
} else {
    console.log("oldCell not found!");
}
