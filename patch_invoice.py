import re

with open("src/server.ts", "r") as f:
    code = f.read()

target = """          if (isHomeCare && calculatedMins === 0 && shift.travel_breakdown) {
              try {
                  const breakdown = JSON.parse(shift.travel_breakdown);
                  for (const b of breakdown) {
                      const m = b.match(/\\(([0-9.]+) mins\\)/);
                      if (m) calculatedMins += parseFloat(m[1]);
                  }
                  if (calculatedMins > 0) {
                      try {
                          db.prepare("UPDATE shifts SET provider_travel_minutes = ? WHERE id = ?").run(calculatedMins, shift.id);
                      } catch(e) {}
                  }
              } catch(e) {}
          }"""

replacement = """          if (isHomeCare && calculatedMins === 0) {
              if (shift.travel_breakdown) {
                  try {
                      const breakdown = JSON.parse(shift.travel_breakdown);
                      for (const b of breakdown) {
                          const m = b.match(/\\(([0-9.]+) mins\\)/);
                          if (m) calculatedMins += parseFloat(m[1]);
                      }
                  } catch(e) {}
              }
              if (calculatedMins === 0 && shift.transport_route_log) {
                  try {
                      const tLog = JSON.parse(shift.transport_route_log);
                      if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.minutes !== undefined) {
                          calculatedMins = tLog.homeCareTravel.minutes;
                      } else if (tLog && tLog.homeCareTravel && tLog.homeCareTravel.legs) {
                          calculatedMins = tLog.homeCareTravel.legs.reduce((sum: number, l: any) => sum + (l.durationMins || 0), 0);
                      }
                  } catch(e) {}
              }
              if (calculatedMins > 0) {
                  try {
                      db.prepare("UPDATE shifts SET provider_travel_minutes = ? WHERE id = ?").run(calculatedMins, shift.id);
                  } catch(e) {}
              }
          }"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced invoice calculation!")
else:
    print("Target not found!")

with open("src/server.ts", "w") as f:
    f.write(code)

