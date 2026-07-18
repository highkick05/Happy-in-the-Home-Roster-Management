const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /db\.prepare\(\n              "INSERT INTO shifts \(staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, abt_approved, funding_type, is_historical\)\n              VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)"\n            \)\.run\(\n              single\.staffId,\n              clientId,\n              mainServiceId,\n              startTime,\n              endTime,\n              shiftStatus,\n              actualNotes,\n              single\.servicesJson,\n              single\.isAbtApproved \? 1 : 0,\n              fType,\n              isHist \? 1 : 0\n            \);/;

const replaceStr = `const primaryVehicle = db.prepare("SELECT id FROM vehicles WHERE user_id = ? AND is_primary = 1 LIMIT 1").get(single.staffId) as {id: number} | undefined;
            const vehicleIdToAssign = primaryVehicle ? primaryVehicle.id : null;
            
            const info = db.prepare(
              "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, abt_approved, funding_type, is_historical, vehicle_id)\\n              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).run(
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
            );`;

code = code.replace(regex, replaceStr);

const regex2 = /const stmt = db\.prepare\(\n            "INSERT INTO shifts \(staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, abt_approved, funding_type, is_historical\)\n            VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)",\n          \);/;

const replaceStr2 = `const primaryVehicle = db.prepare("SELECT id FROM vehicles WHERE user_id = ? AND is_primary = 1 LIMIT 1").get(single.staffId) as {id: number} | undefined;
          const vehicleIdToAssign = primaryVehicle ? primaryVehicle.id : null;
          const stmt = db.prepare(
            "INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, abt_approved, funding_type, is_historical, vehicle_id)\\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          );`;

code = code.replace(regex2, replaceStr2);

const regex3 = /const info = stmt\.run\(\n            single\.staffId,\n            clientId,\n            mainServiceId,\n            startTime,\n            endTime,\n            shiftStatus,\n            actualNotes,\n            single\.servicesJson,\n            single\.isAbtApproved \? 1 : 0,\n            fType,\n            isHist \? 1 : 0\n          \);/;
            
const replaceStr3 = `const info = stmt.run(
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
          );`;

code = code.replace(regex3, replaceStr3);

fs.writeFileSync(file, code);
