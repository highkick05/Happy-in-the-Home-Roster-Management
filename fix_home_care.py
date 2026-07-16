import re

with open("src/utils/homeCareCalculator.ts", "r") as f:
    code = f.read()

target = """        const { distance: dist } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
        totalDist += dist;
        console.log(`Home Care: [${prevClientName}] to [${clientName}] | Gap: ${gapMins}min | Result: ${dist}km`);
        
        const routeDesc = `${prevClientName} (${prevClientInfo?.address}) to ${clientName} (${client?.address})`;
        routeLogs.push({ description: routeDesc, distance: dist, waypoints: [prevClientCoords, clientCoords], addressStart: prevClientInfo?.address, addressEnd: client?.address, homeCareTravel: true });
      } else {
        console.log(`Home Care Reset: Gap of ${gapMins}min detected. Treating [${clientName}] as a new private commute.`);
        routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, waypoints: [], homeCareTravel: true });
      }
    }

    // Persist the result to database
    const distToSave = Number(totalDist.toFixed(2));
    const costToSave = Number(totalDist.toFixed(2)) * rate;"""

replacement = """        const { distance: dist, minutes: mins } = await getGoogleRoutesDistance([prevClientCoords, clientCoords]); 
        totalDist += dist;
        totalMins += mins;
        console.log(`Home Care: [${prevClientName}] to [${clientName}] | Gap: ${gapMins}min | Result: ${dist}km | ${mins}mins`);
        
        const routeDesc = `${prevClientName} (${prevClientInfo?.address}) to ${clientName} (${client?.address})`;
        routeLogs.push({ description: routeDesc, distance: dist, durationMins: mins, waypoints: [prevClientCoords, clientCoords], addressStart: prevClientInfo?.address, addressEnd: client?.address, homeCareTravel: true });
      } else {
        console.log(`Home Care Reset: Gap of ${gapMins}min detected. Treating [${clientName}] as a new private commute.`);
        routeLogs.push({ description: 'No billable provider travel for this shift (Private Commute)', distance: 0, durationMins: 0, waypoints: [], homeCareTravel: true });
      }
    }

    // Persist the result to database
    const distToSave = Number(totalDist.toFixed(2));
    const minsToSave = Number(totalMins.toFixed(2));
    const costToSave = Number(totalDist.toFixed(2)) * rate;"""

code = code.replace("let totalDist = 0;", "let totalDist = 0;\n    let totalMins = 0;")

if target in code:
    code = code.replace(target, replacement)
    print("Replaced home care minutes extraction!")
else:
    print("Target not found!")

target2 = """    currentLogObj.homeCareTravel = {
        calculatedAt: new Date().toISOString(),
        distance: distToSave,
        cost: costToSave,
        legs: routeLogs
    };"""
replacement2 = """    currentLogObj.homeCareTravel = {
        calculatedAt: new Date().toISOString(),
        distance: distToSave,
        minutes: minsToSave,
        cost: costToSave,
        legs: routeLogs
    };"""

if target2 in code:
    code = code.replace(target2, replacement2)
    print("Replaced home care minutes store!")
else:
    print("Target 2 not found!")

with open("src/utils/homeCareCalculator.ts", "w") as f:
    f.write(code)

