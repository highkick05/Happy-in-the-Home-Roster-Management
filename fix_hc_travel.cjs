const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add hc_drive_mins
code = code.replace(
  /    if \(isHC\) {\n       category = 'Home Care Travel';/g,
  `    let hc_drive_mins = 0;
    if (isHC) {
       category = 'Home Care Travel';
       if (parsed && parsed.homeCareTravel && parsed.homeCareTravel.minutes !== undefined) {
           hc_drive_mins = parsed.homeCareTravel.minutes;
       } else if (parsed && parsed.homeCareTravel && parsed.homeCareTravel.legs) {
           hc_drive_mins = parsed.homeCareTravel.legs.reduce((sum, l) => sum + (l.durationMins || 0), 0);
       }
       if (hc_drive_mins <= 0 && log.provider_travel_minutes) {
           hc_drive_mins = log.provider_travel_minutes;
       }
       if (hc_drive_mins < 0) hc_drive_mins = 0;
`
);

code = code.replace(
  /       _category: category,\n       _route: formatRouteLog\(log.transport_route_log, log\) \|\| 'No route logged'\n    };/g,
  `       _category: category,
       _route: formatRouteLog(log.transport_route_log, log) || 'No route logged',
       _isHC: isHC,
       _hc_drive_mins: hc_drive_mins
    };`
);

// Update Transport KM cell
const oldCell = `{Number(log.provider_travel_km) > 0 && (
                              <span className="text-[#8B949E]">
                                PT: {Number(log.provider_travel_km).toFixed(3)} km
                              </span>
                            )}
                            {Number(log.abt_km) > 0 && (
                              <span className="text-[#8B949E]">
                                ABT: {Number(log.abt_km).toFixed(3)} km
                              </span>
                            )}
                            {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                              <span className="text-[#E6EDF3] font-semibold mt-1 border-t border-border-subtle/50 pt-1">
                                Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km
                              </span>
                            ) : (
                              <span className="text-[#8B949E] italic text-xs">0 km</span>
                            )}`;

const newCell = `{log._isHC ? (
                              <>
                                {Number(log.provider_travel_km) > 0 ? (
                                  <>
                                    <span className="text-[#8B949E]">
                                      Inter-Shift Travel: {Number(log.provider_travel_km).toFixed(3)} km
                                    </span>
                                    <span className="text-[#8B949E]">
                                      {Math.round(log._hc_drive_mins)} mins ({(log._hc_drive_mins / 60).toFixed(2)} hrs)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[#8B949E] italic text-xs">0 km</span>
                                )}
                              </>
                            ) : (
                              <>
                                {Number(log.provider_travel_km) > 0 && (
                                  <span className="text-[#8B949E]">
                                    PT: {Number(log.provider_travel_km).toFixed(3)} km
                                  </span>
                                )}
                                {Number(log.abt_km) > 0 && (
                                  <span className="text-[#8B949E]">
                                    ABT: {Number(log.abt_km).toFixed(3)} km
                                  </span>
                                )}
                                {(Number(log.provider_travel_km) > 0 || Number(log.abt_km) > 0) ? (
                                  <span className="text-[#E6EDF3] font-semibold mt-1 border-t border-border-subtle/50 pt-1">
                                    Total: {((Number(log.provider_travel_km) || 0) + (Number(log.abt_km) || 0)).toFixed(3)} km
                                  </span>
                                ) : (
                                  <span className="text-[#8B949E] italic text-xs">0 km</span>
                                )}
                              </>
                            )}`;

if (code.includes(oldCell)) {
    code = code.replace(oldCell, newCell);
    fs.writeFileSync(file, code);
    console.log("Success");
} else {
    console.log("oldCell not found!");
}
