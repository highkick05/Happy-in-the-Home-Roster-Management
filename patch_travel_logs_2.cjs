const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                            {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                              <span className="text-[#E6EDF3] font-semibold mt-1">
                                Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km
                              </span>
                            ) : (
                              <span className="text-[#8B949E] italic text-xs">0 km</span>
                            )}`;
                            
const replacementStr = `                            {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                              <span className="text-[#E6EDF3] font-semibold mt-1 border-t border-border-subtle/50 pt-1">
                                Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km (\${((Number(log.provider_travel_cost) || 0) + (Number(log.abt_cost) || 0)).toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-[#8B949E] italic text-xs">0 km</span>
                            )}`;
                            
code = code.replace(targetStr, replacementStr);
fs.writeFileSync(file, code);
