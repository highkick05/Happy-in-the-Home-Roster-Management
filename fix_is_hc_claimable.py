import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

target = """                         let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             travelCategoryCell = <span className="text-[#E6EDF3] text-xs font-medium">Inter-Shift Travel ({row.travel_minutes || 0} mins)</span>;
                         }"""

replacement = """                         let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
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
                             travelCategoryCell = <span className="text-[#E6EDF3] text-xs font-medium">Inter-Shift Travel ({Math.round(actualDriveMins)} mins)</span>;
                         }"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced travel category cell!")
else:
    print("Target 1 not found!")

target2 = """                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             const decHrs = (row.travel_minutes || 0) / 60;
                             claimableTravelCell = <span className="font-mono text-xs text-emerald-400 tracking-tight">{decHrs.toFixed(2)} hrs</span>;
                         }"""

replacement2 = """                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
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
                             const decHrs = actualDriveMins / 60;
                             claimableTravelCell = <span className="font-mono text-xs text-emerald-400 tracking-tight">{decHrs.toFixed(2)} hrs</span>;
                         }"""

if target2 in code:
    code = code.replace(target2, replacement2)
    print("Replaced claimable travel cell!")
else:
    print("Target 2 not found!")

with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)

