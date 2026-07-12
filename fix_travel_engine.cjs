const fs = require('fs');
let code = fs.readFileSync('src/services/travelEngine.ts', 'utf-8');

const target1 = `             for (const sData of servicesData) {
                 const service = db.prepare('SELECT name, unit FROM services WHERE id = ?').get(sData.serviceId) as any;`;
const replace1 = `             for (const sData of servicesData) {
                 let service = db.prepare('SELECT id, name, unit, status, code, type FROM services WHERE id = ?').get(sData.serviceId) as any;
                 if (service && service.status === 'ARCHIVED') {
                     const activeSrv = db.prepare("SELECT id, name, unit, status, code, type FROM services WHERE code = ? AND type = ? AND (status IS NULL OR status != 'ARCHIVED') ORDER BY id DESC LIMIT 1").get(service.code, service.type) as any;
                     if (activeSrv) {
                         service = activeSrv;
                         sData.serviceId = activeSrv.id;
                     }
                 }`;

code = code.split(target1).join(replace1);
fs.writeFileSync('src/services/travelEngine.ts', code);
