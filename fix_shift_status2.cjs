const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetIndex = code.indexOf('if (idsToProcess.length > 1) {');
const endIndex = code.indexOf('res.json({ id: info.lastInsertRowid });', targetIndex);

if (targetIndex !== -1 && endIndex !== -1) {
  const targetBlock = code.substring(targetIndex, endIndex + 'res.json({ id: info.lastInsertRowid });\n      }'.length);

  const repBlock = \`if (idsToProcess.length > 1) {
        let shiftIds: number[] = [];
        db.transaction((shiftsArray: any[]) => {
          shiftIds = shiftsArray.map((shift: any) => {
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
              \\\`[DEBUG CASCADE] Calling hook for POST batch insert: staffId \\\${single.staffId}, time: \\\${startTime}\\\`,
            );
            recalculateDayTravelForStaff(single.staffId, startTime).catch(console.error);
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
          sid = info.lastInsertRowid as number;
          insertHistoricalData(sid, single);
        })();

        if (!isHist) {
          console.log(
            \\\`[DEBUG CASCADE] Calling hook for POST single insert: staffId \\\${single.staffId}, time: \\\${startTime}\\\`,
          );
          recalculateDayTravelForStaff(single.staffId, startTime).catch(console.error);
        }
        res.json({ id: sid });
      }\`;

  code = code.replace(targetBlock, repBlock);
  fs.writeFileSync('src/server.ts', code);
  console.log('Success');
} else {
  console.log('Failed to find block');
}
