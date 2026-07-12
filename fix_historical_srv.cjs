const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const target1 = `                      if (masterPl && masterPl.effective_date && shiftDateStr < masterPl.effective_date.split('T')[0]) {
                        const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sData.serviceId) as any;
                        if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                          const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                          if (historicalSrv) {
                            sData.serviceId = historicalSrv.id;
                          }
                        }
                      }`;
const replace1 = ``;

code = code.replace(target1, replace1);

const target2 = `                  if (masterPl && masterPl.effective_date && shiftDateStr < masterPl.effective_date.split('T')[0]) {
                    const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(servicesData[0].serviceId) as any;
                    if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                      const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                      if (historicalSrv) {
                        servicesData[0].serviceId = historicalSrv.id;
                      }
                    }
                  }`;

code = code.replace(target2, replace1);

const target3 = `        const masterPl = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1").get() as any;
        if (masterPl && masterPl.effective_date && shiftDate < masterPl.effective_date.split('T')[0]) {
          for (let sd of servicesData) {
            if (sd.serviceId && !sd.isCustom && !String(sd.serviceId).startsWith("custom-")) {
              const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sd.serviceId) as any;
              if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                if (historicalSrv) {
                  sd.serviceId = historicalSrv.id;
                }
              }
            }
          }
        }`;

code = code.replace(target3, replace1);

const target4 = `          const masterPl = db.prepare("SELECT effective_date FROM price_lists WHERE is_master = 1").get() as any;
          if (masterPl && masterPl.effective_date && shiftDate < masterPl.effective_date.split('T')[0]) {
            for (let sd of servicesData) {
              if (sd.serviceId && !sd.isCustom && !String(sd.serviceId).startsWith("custom-")) {
                const currentSrv = db.prepare("SELECT * FROM services WHERE id = ?").get(sd.serviceId) as any;
                if (currentSrv && currentSrv.type === "NDIS" && currentSrv.code) {
                  const historicalSrv = db.prepare("SELECT id FROM services WHERE code = ? AND type = 'NDIS' AND status = 'ARCHIVED' AND id < ? ORDER BY id DESC LIMIT 1").get(currentSrv.code, currentSrv.id) as any;
                  if (historicalSrv) {
                    sd.serviceId = historicalSrv.id;
                  }
                }
              }
            }
          }`;

code = code.replace(target4, replace1);

fs.writeFileSync('src/server.ts', code);
