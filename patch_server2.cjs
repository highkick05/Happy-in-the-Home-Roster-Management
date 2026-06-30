const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const helper = `
function getHistoricalServiceData(db, srv, shiftDateStr) {
  if (!srv || srv.type !== 'NDIS') return { rate: srv?.rate, rates_json: srv?.rates_json };
  if (!shiftDateStr) return { rate: srv.rate, rates_json: srv.rates_json };
  try {
    const shiftDateOnly = shiftDateStr.split('T')[0];
    const pl = db.prepare("SELECT id FROM price_lists WHERE effective_date IS NOT NULL AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1").get(shiftDateOnly);
    if (pl) {
      const item = db.prepare("SELECT rate, rates_json FROM price_list_items WHERE price_list_id = ? AND code = ?").get(pl.id, srv.code);
      if (item && item.rates_json) {
        return { rate: item.rate, rates_json: item.rates_json };
      }
    }
  } catch (e) {}
  return { rate: srv.rate, rates_json: srv.rates_json };
}
`;

code = code.replace(/import multer from "multer";/, 'import multer from "multer";\n' + helper);

// Fix shift fetching inside GET /api/shifts (there are two places)
code = code.replace(
  /const srv = db\.prepare\("SELECT name, code, type, rate, unit, rates_json FROM services WHERE id = \?"\)\.get\(sd\.serviceId\) as any;\s+if \(srv\) {\s+sd\.serviceName = srv\.name;\s+sd\.serviceCode = srv\.code;\s+sd\.serviceType = srv\.type;\s+sd\.serviceRate = srv\.rate;\s+sd\.serviceUnit = srv\.unit;\s+sd\.serviceRatesJson = srv\.rates_json;\s+}/g,
  `const srv = db.prepare("SELECT name, code, type, rate, unit, rates_json FROM services WHERE id = ?").get(sd.serviceId) as any;
                     if (srv) {
                         const hist = getHistoricalServiceData(db, srv, s.start_time);
                         sd.serviceName = srv.name;
                         sd.serviceCode = srv.code;
                         sd.serviceType = srv.type;
                         sd.serviceRate = hist.rate;
                         sd.serviceUnit = srv.unit;
                         sd.serviceRatesJson = hist.rates_json;
                     }`
);

// Fix PUT /api/shifts/:id
code = code.replace(
  /if \(srv\.rates_json\) \{\s+try \{\s+const rates = JSON\.parse\(srv\.rates_json\);/g,
  `const histData = getHistoricalServiceData(db, srv, tmpl.start_time || tmpl.start || startDateTime.toISOString());
                    if (histData.rates_json && (sData.rateOverride === undefined || sData.rateOverride === null || sData.rateOverride === "")) {
                      try {
                        const rates = JSON.parse(histData.rates_json);`
);

// We need to also do POST /api/shifts which has `if (srv.rates_json && (sData.rateOverride === undefined ...`
code = code.replace(
  /if \(srv\.rates_json && \(sData\.rateOverride === undefined \|\| sData\.rateOverride === null \|\| sData\.rateOverride === ""\)\) \{\s+try \{\s+const rates = JSON\.parse\(srv\.rates_json\);/g,
  `const histData = getHistoricalServiceData(db, srv, startDateTime.toISOString());
                      if (histData.rates_json && (sData.rateOverride === undefined || sData.rateOverride === null || sData.rateOverride === "")) {
                        try {
                          const rates = JSON.parse(histData.rates_json);`
);

// And POST /api/shifts/create-from-template
// Wait, I'll just write it back!
fs.writeFileSync('src/server.ts', code);
