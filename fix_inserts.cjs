const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `        if (travelQty > 0 || abtQty > 0 || start_odometer !== undefined || end_odometer !== undefined) {
          db.prepare(\`INSERT INTO staff_activity 
            (staff_id, shift_id, client_id, start_odometer, end_odometer, provider_travel_km, abt_km, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`)
            .run(single.staffId, shiftId, clientId, start_odometer || null, end_odometer || null, travelQty, abtQty, startTime.split('T')[0], now);
            
          db.prepare(\`INSERT INTO compliance 
            (client_id, shift_id, staff_id, type, date, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`)
            .run(clientId, shiftId, single.staffId, 'Transport Evidence', startTime.split('T')[0], 
            \`Manual historical entry: Start Odo \${start_odometer||0}, End Odo \${end_odometer||0}, PT \${travelQty}km, ABT \${abtQty}km\`, 
            'Approved', now);
        }`;

const replaceStr = `        // staff_activity and compliance tables don't exist by default in this context.
        // We will just store the travelQty and abtQty in the main shift record if needed.`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('src/server.ts', code);
    console.log("Success replacing inserts");
} else {
    console.log("Could not find inserts block");
}
