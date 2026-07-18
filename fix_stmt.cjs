const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const regex1 = /const stmt = db\.prepare\([\s\n]+"INSERT INTO shifts \(staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type, is_historical\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)",[\s\n]+\);/;
code = code.replace(regex1, `const stmt = db.prepare(
        "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type, is_historical, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );`);

const regex2 = /const info = stmt\.run\([\s\n]+shift\.staffId,[\s\n]+clientId,[\s\n]+mainServiceId,[\s\n]+startTime,[\s\n]+endTime,[\s\n]+shiftStatus,[\s\n]+actualNotes,[\s\n]+shift\.servicesJson,[\s\n]+shift\.isAbtApproved \? 1 : 0,[\s\n]+fType,[\s\n]+isHist \? 1 : 0[\s\n]+\);/g;
code = code.replace(regex2, `
            const primaryVehicle = db.prepare("SELECT id FROM vehicles WHERE user_id = ? AND is_primary = 1 LIMIT 1").get(shift.staffId) as {id: number} | undefined;
            const vehicleIdToAssign = primaryVehicle ? primaryVehicle.id : null;
            const info = stmt.run(
              shift.staffId,
              clientId,
              mainServiceId,
              startTime,
              endTime,
              shiftStatus,
              actualNotes,
              shift.servicesJson,
              shift.isAbtApproved ? 1 : 0,
              fType,
              isHist ? 1 : 0,
              vehicleIdToAssign
            );`);
            
const regex3 = /const info = stmt\.run\([\s\n]+single\.staffId,[\s\n]+clientId,[\s\n]+mainServiceId,[\s\n]+startTime,[\s\n]+endTime,[\s\n]+shiftStatus,[\s\n]+actualNotes,[\s\n]+single\.servicesJson,[\s\n]+single\.isAbtApproved \? 1 : 0,[\s\n]+fType,[\s\n]+isHist \? 1 : 0,[\s\n]+vehicleIdToAssign[\s\n]+\);/g;

code = code.replace(regex3, `
          const primaryVehicle = db.prepare("SELECT id FROM vehicles WHERE user_id = ? AND is_primary = 1 LIMIT 1").get(single.staffId) as {id: number} | undefined;
          const vehicleIdToAssign = primaryVehicle ? primaryVehicle.id : null;
          const info = stmt.run(
            single.staffId,
            clientId,
            mainServiceId,
            startTime,
            endTime,
            shiftStatus,
            actualNotes,
            single.servicesJson,
            single.isAbtApproved ? 1 : 0,
            fType,
            isHist ? 1 : 0,
            vehicleIdToAssign
          );`);
          
fs.writeFileSync(file, code);
console.log("Replaced stmt");
