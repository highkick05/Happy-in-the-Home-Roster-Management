const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');
code = code.replace(
  '                       provider_travel_km = ?, abt_km = ?,',
  '                       provider_travel_km = ?, abt_km = ?, progress_note = ?,'
);
code = code.replace(
  '                   WHERE id = ?`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, travelCost, abtCost, shiftId);',
  '                   WHERE id = ?`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, progress_note || null, travelCost, abtCost, shiftId);'
);
fs.writeFileSync('src/server.ts', code);
