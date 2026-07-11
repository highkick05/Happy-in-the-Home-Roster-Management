const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetBlock = `      if (idsToProcess.length > 1) {
        const createShifts = db.transaction((shiftsArray) => {
          return shiftsArray.map((shift: any) => {
            const info = stmt.run(
              shift.staffId,
              clientId,
              mainServiceId,
              startTime,
              endTime,
              status || "DRAFT",
              notes,
              shift.servicesJson,
              shift.isAbtApproved ? 1 : 0,
              fType,
            );
            return info.lastInsertRowid;
          });
        });
        const shiftIds = createShifts(processedStaffShifts);

        // Recalculate after batch insert
        for (const single of processedStaffShifts) {
          console.log(
            \`[DEBUG CASCADE] Calling hook for POST batch insert: staffId \${single.staffId}, time: \${startTime}\`,
          );
          await recalculateDayTravelForStaff(single.staffId, startTime);
        }
        res.json({ id: shiftIds[0], ids: shiftIds });
      } else {
        const single = processedStaffShifts[0];
        const info = stmt.run(
          single.staffId,
          clientId,
          mainServiceId,
          startTime,
          endTime,
          status || "DRAFT",
          notes,
          single.servicesJson,
          single.isAbtApproved ? 1 : 0,
          fType,
        );

        // Recalculate after single insert
        console.log(
          \`[DEBUG CASCADE] Calling hook for POST single insert: staffId \${single.staffId}, time: \${startTime}\`,
        );
        await recalculateDayTravelForStaff(single.staffId, startTime);
        res.json({ id: info.lastInsertRowid });
      }`;

const repBlock = `      if (idsToProcess.length > 1) {
        let shiftIds = [];
        db.transaction((shiftsArray) => {
          shiftIds = shiftsArray.map((shift) => {
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
            );
            insertHistoricalData(info.lastInsertRowid, shift);
            return info.lastInsertRowid;
          });
        })(processedStaffShifts);

        for (const single of processedStaffShifts) {
          if (!isHist) {
            console.log(
              \`[DEBUG CASCADE] Calling hook for POST batch insert: staffId \${single.staffId}, time: \${startTime}\`,
            );
            await recalculateDayTravelForStaff(single.staffId, startTime);
          }
        }
        res.json({ id: shiftIds[0], ids: shiftIds });
      } else {
        const single = processedStaffShifts[0];
        let sid = 0;
        db.transaction(() => {
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
          );
          sid = info.lastInsertRowid;
          insertHistoricalData(sid, single);
        })();

        if (!isHist) {
          console.log(
            \`[DEBUG CASCADE] Calling hook for POST single insert: staffId \${single.staffId}, time: \${startTime}\`,
          );
          await recalculateDayTravelForStaff(single.staffId, startTime);
        }
        res.json({ id: sid });
      }`;

code = code.replace(targetBlock, repBlock);
fs.writeFileSync('src/server.ts', code);
console.log(code.includes('insertHistoricalData(sid, single);') ? 'Success' : 'Failed');
