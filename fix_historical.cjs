const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `        // staff_activity and compliance tables don't exist by default in this context.
        // We will just store the travelQty and abtQty in the main shift record if needed.`;

const replaceStr = `        if (travelQty > 0 || abtQty > 0 || start_odometer !== undefined || end_odometer !== undefined) {
           db.prepare(\`UPDATE shifts 
                       SET actual_start_time = ?, actual_finish_time = ?,
                           odometer_start_reading = ?, odometer_end_reading = ?,
                           provider_travel_km = ?, abt_km = ?
                       WHERE id = ?\`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, shiftId);
        }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('src/server.ts', code);
    console.log("Success replacing insertHistoricalData");
} else {
    console.log("Could not find insertHistoricalData block");
}
