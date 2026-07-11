const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `        if (travelQty > 0 || abtQty > 0 || start_odometer !== undefined || end_odometer !== undefined) {
           db.prepare(\`UPDATE shifts 
                       SET actual_start_time = ?, actual_finish_time = ?,
                           odometer_start_reading = ?, odometer_end_reading = ?,
                           provider_travel_km = ?, abt_km = ?
                       WHERE id = ?\`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, shiftId);
        }`;

const replaceStr = `        db.prepare(\`UPDATE shifts 
                   SET actual_start_time = ?, actual_finish_time = ?,
                       odometer_start_reading = ?, odometer_end_reading = ?,
                       provider_travel_km = ?, abt_km = ?
                   WHERE id = ?\`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, shiftId);`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('src/server.ts', code);
    console.log("Success replacing fix_hist_update");
} else {
    console.log("Could not find fix_hist_update block");
}
