import fs from 'fs';
let content = fs.readFileSync('src/server.ts', 'utf8');

const hrsOrig1 = `      shifts.forEach((s: any) => {
        let hrs = 0;
        if(s.actual_start_time && s.actual_finish_time) {
          hrs = (new Date(s.actual_finish_time).getTime() - new Date(s.actual_start_time).getTime()) / (1000 * 60 * 60);
        } else if (s.start_time && s.end_time) {
          hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
        }`;

const hrsNew1 = `      shifts.forEach((s: any) => {
        let hrs = 0;
        let qtyOverride = null;
        try {
          if (s.services_json) {
            const srvList = JSON.parse(s.services_json);
            if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== '') {
              qtyOverride = parseFloat(srvList[0].qtyOverride);
            }
          }
        } catch (e) {}

        if (qtyOverride !== null && !isNaN(qtyOverride)) {
          hrs = qtyOverride;
        } else {
          if (s.actual_start_time && s.actual_finish_time) {
            const aHrs = (new Date(s.actual_finish_time).getTime() - new Date(s.actual_start_time).getTime()) / (1000 * 60 * 60);
            if (aHrs > 0) {
              hrs = aHrs;
            } else {
              hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
            }
          } else if (s.start_time && s.end_time) {
            hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
          }
        }`;

content = content.replace(hrsOrig1, hrsNew1);

const hrsOrig2 = `         let hrs = 0;
         if(s.actual_start_time && s.actual_finish_time) {
           hrs = (new Date(s.actual_finish_time).getTime() - new Date(s.actual_start_time).getTime()) / (1000 * 60 * 60);
         } else if (s.start_time && s.end_time) {
           hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
         }`;

const hrsNew2 = `         let hrs = 0;
         let qtyOverride = null;
         try {
           if (s.services_json) {
             const srvList = JSON.parse(s.services_json);
             if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== '') {
               qtyOverride = parseFloat(srvList[0].qtyOverride);
             }
           }
         } catch (e) {}

         if (qtyOverride !== null && !isNaN(qtyOverride)) {
           hrs = qtyOverride;
         } else {
           if (s.actual_start_time && s.actual_finish_time) {
             const aHrs = (new Date(s.actual_finish_time).getTime() - new Date(s.actual_start_time).getTime()) / (1000 * 60 * 60);
             if (aHrs > 0) {
               hrs = aHrs;
             } else {
               hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
             }
           } else if (s.start_time && s.end_time) {
             hrs = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
           }
         }`;

content = content.replace(hrsOrig2, hrsNew2);

const travelCostOrigRow = `         const row = evidenceSheet.addRow({
           clientName: \`\${s.client_first} \${s.client_last}\`,
           staffName: \`\${s.staff_first} \${s.staff_last}\`,
           serviceDate: dateStr,
           shiftTimes: timeStr,
           careType: s.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS Support',
           careHours: Math.max(0, hrs).toFixed(2),
           noteStatus: s.notes ? 'Completed' : 'Pending',
           totalKm: km,
           // Explicitly set 0 so formatting applies, we'll override it with the formula below
           travelCost: 0,`;

const travelCostNewRow = `         const isHomeCare = (s.funding_type === 'HOME_CARE' || s.funding_type === 'Home Care' || s.funding_type === 'HCP');
         const row = evidenceSheet.addRow({
           clientName: \`\${s.client_first} \${s.client_last}\`,
           staffName: \`\${s.staff_first} \${s.staff_last}\`,
           serviceDate: dateStr,
           shiftTimes: timeStr,
           careType: s.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS Support',
           careHours: Math.max(0, hrs).toFixed(2),
           noteStatus: s.notes ? 'Completed' : 'Pending',
           totalKm: km,
           // Explicitly set 0 so formatting applies, we'll override it with the formula below
           travelCost: isHomeCare ? 0 : ((s.provider_travel_cost || 0) + (s.abt_cost || 0)),`;

content = content.replace(travelCostOrigRow, travelCostNewRow);

const travelCostFormulaOrig = `         // Currency formatting & Formula for cost
         const costCell = row.getCell('travelCost');
         costCell.numFmt = '"$"#,##0.00';
         costCell.value = { formula: \`H\${row.number} * 1.0\`, date1904: false };`;

const travelCostFormulaNew = `         // Currency formatting & Formula for cost
         const costCell = row.getCell('travelCost');
         costCell.numFmt = '"$"#,##0.00';`;

content = content.replace(travelCostFormulaOrig, travelCostFormulaNew);

fs.writeFileSync('src/server.ts', content);
console.log('Update complete');
