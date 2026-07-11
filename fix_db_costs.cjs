const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const shifts = db.prepare("SELECT id, services_json FROM shifts WHERE is_historical = 1 OR provider_travel_cost IS NULL").all();

let updated = 0;
for (let shift of shifts) {
  let travelCost = 0;
  let abtCost = 0;
  try {
    const sData = JSON.parse(shift.services_json || '[]');
    for (let s of sData) {
      const srv = db.prepare("SELECT name, rate FROM services WHERE id = ?").get(s.serviceId);
      if (srv) {
        const name = srv.name.toLowerCase();
        const rate = Number(s.rateOverride || srv.rate || 1.00);
        if (name.includes('provider travel') && s.qtyOverride) {
            travelCost += Number(s.qtyOverride) * rate;
        }
        if (name.includes('activity based transport') && s.qtyOverride) {
            abtCost += Number(s.qtyOverride) * rate;
        }
      }
    }
  } catch(e) {}
  
  if (travelCost > 0 || abtCost > 0) {
     db.prepare("UPDATE shifts SET provider_travel_cost = ?, abt_cost = ? WHERE id = ?").run(travelCost, abtCost, shift.id);
     updated++;
  }
}
console.log('Fixed ' + updated + ' shifts');
