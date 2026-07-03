const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const prov_km = shift\.respite_booking_id\s*\?\s*0\s*:\s*shift\.provider_travel_km \|\| 0;\s*const abt_km = shift\.respite_booking_id \? 0 : shift\.abt_km \|\| 0;\s*totals\.travelKm \+= isHomeCare \? hc_travel_km : prov_km \+ abt_km;\s*totals\.travelHrs \+= isHomeCare \? hc_travel_hrs : 0;\s*totals\.providerTravelKm =\s*\(totals\.providerTravelKm \|\| 0\) \+ \(isHomeCare \? 0 : prov_km\);\s*totals\.abtKm = \(totals\.abtKm \|\| 0\) \+ \(isHomeCare \? 0 : abt_km\);\s*const rowProvReimbursement = parseFloat\(\(prov_km \* 0\.99\)\.toFixed\(2\)\);\s*const rowAbtReimbursement = parseFloat\(\(abt_km \* 0\.99\)\.toFixed\(2\)\);\s*const shiftTravelPay = isHomeCare\s*\?\s*0\s*:\s*rowProvReimbursement \+ rowAbtReimbursement;\s*totals\.travelPayTotal = \(totals\.travelPayTotal \|\| 0\) \+ shiftTravelPay;/m;

const replacement = `const prov_km = (shift.respite_booking_id ? 0 : shift.provider_travel_km || 0) * (hasProviderTravelService ? 1 : 0);
          const abt_km = (shift.respite_booking_id ? 0 : shift.abt_km || 0) * (hasABTService ? 1 : 0);

          totals.travelKm += isHomeCare ? hc_travel_km : prov_km + abt_km;
          totals.travelHrs += isHomeCare ? hc_travel_hrs : 0;
          totals.providerTravelKm =
            (totals.providerTravelKm || 0) + (isHomeCare ? 0 : prov_km);
          totals.abtKm = (totals.abtKm || 0) + (isHomeCare ? 0 : abt_km);

          const rowProvReimbursement = parseFloat((prov_km * 0.99).toFixed(2));
          const rowAbtReimbursement = parseFloat((abt_km * 0.99).toFixed(2));
          const shiftTravelPay = isHomeCare
            ? 0
            : rowProvReimbursement + rowAbtReimbursement;
          totals.travelPayTotal = (totals.travelPayTotal || 0) + shiftTravelPay;`;

if(code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/server.ts', code);
    console.log("Replaced totals part");
} else {
    console.log("Could not match totals part");
}
