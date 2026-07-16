const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = fs.readFileSync('target_actual.txt', 'utf8');
const lines = targetStr.split('\n');
const matchStr = lines.slice(1, lines.length - 2).join('\n'); // drop the '          }' at top and 'row.getCell...' at bottom

console.log("Matching:\n", matchStr);

const newStr = `          const isHomeCare =
            s.funding_type === "HOME_CARE" ||
            s.funding_type === "Home Care" ||
            s.funding_type === "HCP";
          const hc_km = isHomeCare
            ? s.home_care_travel_km || s.provider_travel_km || 0
            : 0;
          const p_km = isHomeCare ? 0 : s.provider_travel_km || 0;
          
          const extractAddress = (desc) => {
              if (!desc) return '';
              const match = desc.match(/\\(([^)]+)\\)/);
              if (match) {
                  const content = match[1].trim();
                  if (!content.match(/^[\\s*[-+]?\\d*\\.?\\d+$/)) {
                      return match;
                  }
              }
              let cleaned = desc.replace(/\\([^)]+\\)/g, '').trim();
              return cleaned || desc.trim();
          };
          
          const formatRouteLog = (logStr, rowData) => {
            if (!logStr) return null;
            if (logStr === 'No route logged') return 'No route logged';
            if (!logStr.startsWith('{')) return logStr;
            const fallbackOrigin = rowData?.origin_address || 'Unknown';
            const fallbackDest = rowData?.destination_address || 'Unknown';
            const cleanLocationStr = (val, fallback) => {
                if (!val || val.trim().toLowerCase() === 'location' || val.trim().toLowerCase() === 'unknown' || val.trim() === '') {
                    return fallback;
                }
                return val;
            };
            try {
              const parsed = JSON.parse(logStr);
              let out = [];
              if (parsed.homeCareTravel && parsed.homeCareTravel.legs) {
                const hcLegs = parsed.homeCareTravel.legs.map((l, idx) => {
                   if (l.description && l.description.includes('Private Commute')) return 'Private Commute';
                   let start = l.addressStart; let end = l.addressEnd;
                   if (!start || !end) {
                      const parts = l.description ? l.description.split(' to ') : [];
                      if (parts.length === 2) { start = start || extractAddress(parts[0]); end = end || extractAddress(parts[1]); }
                   }
                   return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
                }).join(' | ');
                if (hcLegs) out.push(hcLegs);
              }
              if (parsed.providerTravel && parsed.providerTravel.legs) {
                const pLegs = parsed.providerTravel.legs.map((l, idx) => {
                   if (l.distance === 0 && l.description && l.description.includes('Capped')) return 'MMM6 Capped';
                   let start = l.addressStart; let end = l.addressEnd;
                   if (!start || !end) {
                      const parts = l.description ? l.description.split(' to ') : [];
                      if (parts.length === 2) { start = start || extractAddress(parts[0]); end = end || extractAddress(parts[1]); }
                      else {
                         const arrowParts = l.description ? l.description.split(' → ') : [];
                         if (arrowParts.length === 2) { start = start || extractAddress(arrowParts[0]); end = end || extractAddress(arrowParts[1]); }
                      }
                   }
                   return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
                }).join(' | ');
                if (pLegs) out.push(\`PT: \${pLegs}\`);
              }
              if (parsed.abt && parsed.abt.legs) {
                const aLegs = parsed.abt.legs.map((l, idx) => {
                   let start = l.addressStart; let end = l.addressEnd;
                   if (!start || !end) {
                      const arrowParts = l.description ? l.description.split(' → ') : [];
                      if (arrowParts.length === 2) { start = start || extractAddress(arrowParts[0]); end = end || extractAddress(arrowParts[1]); }
                      else {
                         const parts = l.description ? l.description.split(' to ') : [];
                         if (parts.length === 2) { start = start || extractAddress(parts[0]); end = end || extractAddress(parts[1]); }
                      }
                   }
                   return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
                }).join(' | ');
                if (aLegs) out.push(\`ABT: \${aLegs}\`);
              }
              return out.join(' ; ') || logStr;
            } catch (e) { return logStr; }
          };

          const isBoth = p_km > 0 && (s.abt_km || 0) > 0;
          const hasPT = p_km > 0;
          const hasABT = (s.abt_km || 0) > 0;
          let travelCategoryCell = "-";
          let travelRouteCell = "-";
          let claimableTravelCell = "-";
          
          if (isHomeCare) {
              let actualDriveMins = 0;
              if (s.transport_route_log) {
                  try {
                      const tLog = JSON.parse(s.transport_route_log);
                      if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.minutes !== undefined) {
                          actualDriveMins = tLog.homeCareTravel.minutes;
                      } else if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.legs) {
                          actualDriveMins = tLog.homeCareTravel.legs.reduce((sum, l) => sum + (l.durationMins || 0), 0);
                      }
                  } catch(e) {}
              }
              if (actualDriveMins <= 0 && s.provider_travel_minutes) {
                  actualDriveMins = s.provider_travel_minutes;
              }
              if (actualDriveMins < 0) actualDriveMins = 0;
              travelCategoryCell = \`Inter-Shift Travel (\${Math.round(actualDriveMins)} mins)\`;
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) || '' : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
              const decHrs = actualDriveMins / 60;
              claimableTravelCell = \`\${decHrs.toFixed(2)} hrs\`;
          } else if (isBoth) {
              travelCategoryCell = "Provider Travel, Activity Based Transport";
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) || '' : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
              claimableTravelCell = \`PT: \${p_km} km ($\${(p_km * 1.0).toFixed(2)})\\nABT: \${s.abt_km} km ($\${((s.abt_km||0) * 1.0).toFixed(2)})\`;
          } else if (hasPT) {
              travelCategoryCell = "Provider Travel";
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) || '' : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
              claimableTravelCell = \`PT: \${p_km} km ($\${(p_km * 1.0).toFixed(2)})\`;
          } else if (hasABT) {
              travelCategoryCell = "Activity Based Transport";
              travelRouteCell = formatRouteLog(s.transport_route_log, s) || "-";
              claimableTravelCell = \`ABT: \${s.abt_km} km ($\${((s.abt_km||0) * 1.0).toFixed(2)})\`;
          }

          const row = evidenceSheet.addRow({
            clientName: \`\${s.client_first} \${s.client_last}\`,
            staffName: \`\${s.staff_first} \${s.staff_last}\`,
            serviceDate: dateStr,
            shiftTimes: timeStr,
            careType:
              s.funding_type === "HOME_CARE" || s.funding_type === "Home Care" || s.funding_type === "HCP" ? "HOME CARE" : "NDIS",
            careHours: Math.max(0, hrs).toFixed(2) + "h",
            noteStatus: s.notes ? "COMPLETED" : "PENDING SYNC",
            travelCategory: travelCategoryCell,
            travelRoute: travelRouteCell,
            claimableTravel: claimableTravelCell,
            startOdo: s.odometer_start_reading ? Math.round(Number(s.odometer_start_reading)).toString() : "",
            startPhoto: "",
            endOdo: s.odometer_end_reading ? Math.round(Number(s.odometer_end_reading)).toString() : "",
            endPhoto: "",
          });`;

if (content.includes(matchStr)) {
    content = content.replace(matchStr, newStr);
    fs.writeFileSync('src/server.ts', content);
    console.log('Success');
} else {
    console.log('Target string not found!');
}
