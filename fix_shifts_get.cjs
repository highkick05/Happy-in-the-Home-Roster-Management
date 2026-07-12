const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const target1 = `                   const srv = db.prepare("SELECT name, code, type, rate, unit, rates_json FROM services WHERE id = ?").get(sd.serviceId) as any;
                     if (srv) {`;
const replace1 = `                   let srv = db.prepare("SELECT id, name, code, type, rate, unit, rates_json, status FROM services WHERE id = ?").get(sd.serviceId) as any;
                     if (srv) {
                         if (srv.status === 'ARCHIVED') {
                             const activeSrv = db.prepare("SELECT id, name, code, type, rate, unit, rates_json FROM services WHERE code = ? AND type = ? AND (status IS NULL OR status != 'ARCHIVED') ORDER BY id DESC LIMIT 1").get(srv.code, srv.type) as any;
                             if (activeSrv) {
                                 srv = activeSrv;
                                 sd.serviceId = activeSrv.id;
                             }
                         }`;

code = code.split(target1).join(replace1);
fs.writeFileSync('src/server.ts', code);
