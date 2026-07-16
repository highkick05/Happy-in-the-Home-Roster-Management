const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const targetCols = `        evidenceSheet.columns = [
          { header: "Client Name", key: "clientName", width: 25 },
          { header: "Staff Name", key: "staffName", width: 25 },
          { header: "Service Date", key: "serviceDate", width: 15 },
          { header: "Shift Timestamps", key: "shiftTimes", width: 30 },
          { header: "Care Type", key: "careType", width: 20 },
          { header: "Logged Care Hours", key: "careHours", width: 20 },
          { header: "Progress Note Status", key: "noteStatus", width: 25 },
          { header: "Total Transport Kilometers", key: "totalKm", width: 30 },
          { header: "Calculated Travel Cost", key: "travelCost", width: 25 },
          { header: "Start Odometer", key: "startOdo", width: 15 },
          { header: "Start Photo", key: "startPhoto", width: 15 },
          { header: "End Odometer", key: "endOdo", width: 15 },
          { header: "End Photo", key: "endPhoto", width: 15 },
        ];`;

const newCols = `        evidenceSheet.columns = [
          { header: "CLIENT NAME", key: "clientName", width: 25 },
          { header: "STAFF NAME", key: "staffName", width: 25 },
          { header: "SERVICE DATE", key: "serviceDate", width: 15 },
          { header: "SHIFT TIMESTAMPS", key: "shiftTimes", width: 30 },
          { header: "CARE TYPE", key: "careType", width: 20 },
          { header: "LOGGED CARE HRS", key: "careHours", width: 20 },
          { header: "PROGRESS NOTE STATUS", key: "noteStatus", width: 25 },
          { header: "TRAVEL CATEGORY & TIME", key: "travelCategory", width: 35 },
          { header: "TRAVEL ROUTE", key: "travelRoute", width: 60 },
          { header: "CLAIMABLE TRAVEL", key: "claimableTravel", width: 45 },
          { header: "START ODOMETER", key: "startOdo", width: 15 },
          { header: "START PHOTO", key: "startPhoto", width: 15 },
          { header: "END ODOMETER", key: "endOdo", width: 15 },
          { header: "END PHOTO", key: "endPhoto", width: 15 },
        ];`;

content = content.replace(targetCols, newCols);

const targetRowLogic = `          const km = p_km + hc_km + (s.abt_km || 0);
          const row = evidenceSheet.addRow({
            clientName: \`\${s.client_first} \${s.client_last}\`,
            staffName: \`\${s.staff_first} \${s.staff_last}\`,
            serviceDate: dateStr,
            shiftTimes: timeStr,
            careType:
              s.funding_type === "HOME_CARE" ? "Home Care" : "NDIS Support",
            careHours: Math.max(0, hrs).toFixed(2),
            noteStatus: s.notes ? "Completed" : "Pending",
            totalKm: km,
            // Explicitly set 0 so formatting applies, we'll override it with the formula below
            travelCost: isHomeCare
              ? 0
              : ((p_km * 1.00) + ((s.abt_km || 0) * 1.00)),
            startOdo: s.odometer_start_reading ? Math.round(Number(s.odometer_start_reading)).toString() : "",
            startPhoto: "",
            endOdo: s.odometer_end_reading ? Math.round(Number(s.odometer_end_reading)).toString() : "",
            endPhoto: "",
          });`;

const newRowLogic = `          const extractAddress = (desc) => {
              if (!desc) return null;
              const matches = [...desc.matchAll(/\\(([^)]+)\\)/g)];
              for (let i = matches.length - 1; i >= 0; i--) {
                  const m = matches[i][1];
                  if (!m.includes('%') && !m.match(/^[-+]?\\d*\\.?\\d+,\\s*[-+]?\\d*\\.?\\d+$/)) {
                      return m;
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

          const km = p_km + hc_km + (s.abt_km || 0);

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
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
              const decHrs = actualDriveMins / 60;
              claimableTravelCell = \`\${decHrs.toFixed(2)} hrs\`;
          } else if (isBoth) {
              travelCategoryCell = "Provider Travel, Activity Based Transport";
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
              claimableTravelCell = \`PT: \${p_km} km ($\${(p_km * 1.0).toFixed(2)})\\nABT: \${s.abt_km} km ($\${((s.abt_km||0) * 1.0).toFixed(2)})\`;
          } else if (hasPT) {
              travelCategoryCell = "Provider Travel";
              travelRouteCell = s.transport_route_log ? formatRouteLog(s.transport_route_log, s) : \`\${s.origin_address || 'Unknown'} ➡️ \${s.destination_address || 'Unknown'}\`;
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

content = content.replace(targetRowLogic, newRowLogic);

// One detail to fix: currency formatting & formula for cost. Wait, cost Cell is no longer named travelCost but claimableTravel? Let's check:
const formatTarget = `          // Currency formatting & Formula for cost
          const costCell = row.getCell("travelCost");
          costCell.numFmt = '"$"#,##0.00';`;

const formatReplace = `          // (Cost formatting is now part of the string in claimableTravel)`;

content = content.replace(formatTarget, formatReplace);

fs.writeFileSync(file, content);
console.log("Done patching server.ts");
