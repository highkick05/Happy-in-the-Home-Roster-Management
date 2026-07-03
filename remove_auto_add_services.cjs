const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetToRemove = `
              if (abt_km > 0 && !hasABT) {
                const abtService = db.prepare("SELECT id FROM services WHERE LOWER(name) LIKE '%activity based transport%' LIMIT 1").get() as any;
                if (abtService) {
                  servicesData.push({
                    serviceId: abtService.id,
                    hoursType: "Normal",
                    qtyOverride: parseFloat(abt_km.toFixed(2))
                  });
                  changed = true;
                }
              }

              if (pTravel.distance > 0 && !hasProviderTravel) {
                const ptService = db.prepare("SELECT id FROM services WHERE LOWER(name) LIKE '%provider travel%' AND LOWER(name) NOT LIKE '%non-labour%' LIMIT 1").get() as any;
                if (ptService) {
                  servicesData.push({
                    serviceId: ptService.id,
                    hoursType: "Normal",
                    qtyOverride: parseFloat((pTravel.minutes !== undefined ? pTravel.minutes / 60 : pTravel.distance).toFixed(2))
                  });
                  changed = true;
                }
              }
`;

if (code.includes(targetToRemove.trim())) {
    console.log("Removing auto add services... but first checking with regex just in case.");
}

code = code.replace(/if\s*\(abt_km\s*>\s*0\s*&&\s*!hasABT\)\s*\{\s*const\s*abtService[\s\S]*?\}\s*\}\s*if\s*\(pTravel\.distance\s*>\s*0\s*&&\s*!hasProviderTravel\)\s*\{\s*const\s*ptService[\s\S]*?\}\s*\}/, "");

fs.writeFileSync('src/server.ts', code);
