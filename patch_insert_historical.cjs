const fs = require('fs');
const content = fs.readFileSync('src/server.ts', 'utf8');
const target = `      const insertHistoricalData = (shiftId, single) => {
        if (!isHist) return;
        const now = new Date().toISOString();
        let travelQty = 0, abtQty = 0;
        let sData = [];
        try { sData = JSON.parse(single.servicesJson || '[]'); } catch(e){}
        for (let s of sData) {
           const srv = db.prepare("SELECT name FROM services WHERE id = ?").get(s.serviceId);
           if (srv) {
             const name = srv.name.toLowerCase();
             if (name.includes('provider travel') && s.qtyOverride) travelQty += Number(s.qtyOverride);
             if (name.includes('activity based transport') && s.qtyOverride) abtQty += Number(s.qtyOverride);
           }
        }
        db.prepare(\`UPDATE shifts 
                   SET actual_start_time = ?, actual_finish_time = ?,
                       odometer_start_reading = ?, odometer_end_reading = ?,
                       provider_travel_km = ?, abt_km = ?
                   WHERE id = ?\`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, shiftId);
      };`;

const replacement = `      const insertHistoricalData = (shiftId, single) => {
        if (!isHist) return;
        const now = new Date().toISOString();
        let travelQty = 0, abtQty = 0;
        let travelCost = 0, abtCost = 0;
        let sData = [];
        try { sData = JSON.parse(single.servicesJson || '[]'); } catch(e){}
        for (let s of sData) {
           const srv = db.prepare("SELECT name, rate FROM services WHERE id = ?").get(s.serviceId);
           if (srv) {
             const name = srv.name.toLowerCase();
             const rate = Number(s.rateOverride || srv.rate || 1.00);
             if (name.includes('provider travel') && s.qtyOverride) {
                 travelQty += Number(s.qtyOverride);
                 travelCost += Number(s.qtyOverride) * rate;
             }
             if (name.includes('activity based transport') && s.qtyOverride) {
                 abtQty += Number(s.qtyOverride);
                 abtCost += Number(s.qtyOverride) * rate;
             }
           }
        }
        db.prepare(\`UPDATE shifts 
                   SET actual_start_time = ?, actual_finish_time = ?,
                       odometer_start_reading = ?, odometer_end_reading = ?,
                       provider_travel_km = ?, abt_km = ?,
                       provider_travel_cost = ?, abt_cost = ?
                   WHERE id = ?\`).run(startTime, endTime, start_odometer || null, end_odometer || null, travelQty, abtQty, travelCost, abtCost, shiftId);
      };`;

if(content.includes(target)) {
  fs.writeFileSync('src/server.ts', content.replace(target, replacement));
  console.log('Patched insertHistoricalData');
} else {
  console.log('Target not found in src/server.ts');
}
