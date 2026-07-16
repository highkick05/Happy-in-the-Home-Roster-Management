const fs = require('fs');
const file = 'src/components/Compliance/ComplianceDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                             let actualDriveMins = 0;
                             if (row.transport_route_log) {
                                try {
                                   const tLog = JSON.parse(row.transport_route_log);
                                   if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.minutes !== undefined) {
                                      actualDriveMins = tLog.homeCareTravel.minutes;
                                   } else if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.legs) {
                                      actualDriveMins = tLog.homeCareTravel.legs.reduce((sum: number, l: any) => sum + (l.durationMins || 0), 0);
                                   }
                                } catch(e) {}
                             }`;

const replacement = `                             let actualDriveMins = 0;
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
                             if (actualDriveMins < 0) actualDriveMins = 0;`;

// Wait, I need to do this in both places where actualDriveMins is computed for isHC
content = content.replaceAll(target, replacement);

fs.writeFileSync(file, content);
console.log("Done patch 2");
