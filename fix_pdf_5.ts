import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const regexEvidencePack = /\/\/ Section 3: Transport Evidence[\s\S]*?doc\.end\(\);/m;

const replacementEvidencePack = `// Section 3: Transport Evidence
      doc.fontSize(16).font('Helvetica-Bold').text('3. Transport Evidence');
      doc.moveDown();
      
      const tableHeaders = ['Date', 'Staff', 'Travel Route (From -> To)', 'Category', 'KM'];
      const headerY = doc.y;
      doc.rect(50, headerY - 5, 500, 20).fill('#f4f4f5');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
      doc.text(tableHeaders[0], 55, headerY);
      doc.text(tableHeaders[1], 105, headerY);
      doc.text(tableHeaders[2], 180, headerY);
      doc.text(tableHeaders[3], 340, headerY);
      doc.text(tableHeaders[4], 420, headerY);
      doc.y = headerY + 20;

      shifts.forEach((s) => {
        if (s.provider_travel_km > 0 || s.home_care_travel_km > 0 || s.abt_km > 0) {
            const startTz = formatTz(s.actual_start_time, s.start_time);
            
            let routeLog: any = null;
            if (s.transport_route_log) {
                try { routeLog = JSON.parse(s.transport_route_log); } catch(e){}
            }

            let entries: any[] = [];
            
            if (s.provider_travel_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
                   routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? \` (\${fl.address})\` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? \` (\${tl.address})\` : '') : tName;
                           if (fl.coords) coordsStrs.push(\`[Leg \${idx+1}] F: \${fl.coords}\`);
                           if (tl.coords) coordsStrs.push(\`[Leg \${idx+1}] T: \${tl.coords}\`);
                       }
                       routeStrs.push(\`[Leg \${idx+1}] From: \${fName}\\nTo: \${tName}\`);
                   });
               }
               entries.push({
                   routeStr: routeStrs.join('\\n'),
                   cat: 'Provider Travel',
                   km: s.provider_travel_km,
                   coords: coordsStrs.join('\\n') || 'N/A'
               });
            }

            if (s.home_care_travel_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.homeCareTravel && routeLog.homeCareTravel.legs) {
                   routeLog.homeCareTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? \` (\${fl.address})\` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? \` (\${tl.address})\` : '') : tName;
                           if (fl.coords) coordsStrs.push(\`[Leg \${idx+1}] F: \${fl.coords}\`);
                           if (tl.coords) coordsStrs.push(\`[Leg \${idx+1}] T: \${tl.coords}\`);
                       }
                       routeStrs.push(\`[Leg \${idx+1}] From: \${fName}\\nTo: \${tName}\`);
                   });
               } else if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
                   routeLog.providerTravel.legs.forEach((leg: any, idx: number) => {
                       let fName = leg.fromName || 'Unknown';
                       let tName = leg.toName || 'Client';
                       if (leg.description && leg.description.includes(' to ')) {
                           const [f, t] = leg.description.split(' to ');
                           const fl = parseLocationString(f);
                           const tl = parseLocationString(t);
                           fName = fl.name ? fl.name + (fl.address ? \` (\${fl.address})\` : '') : fName;
                           tName = tl.name ? tl.name + (tl.address ? \` (\${tl.address})\` : '') : tName;
                           if (fl.coords) coordsStrs.push(\`[Leg \${idx+1}] F: \${fl.coords}\`);
                           if (tl.coords) coordsStrs.push(\`[Leg \${idx+1}] T: \${tl.coords}\`);
                       }
                       routeStrs.push(\`[Leg \${idx+1}] From: \${fName}\\nTo: \${tName}\`);
                   });
               }
               entries.push({
                   routeStr: routeStrs.join('\\n'),
                   cat: 'Home Care Travel',
                   km: s.home_care_travel_km,
                   coords: coordsStrs.join('\\n') || 'N/A'
               });
            }

            if (s.abt_km > 0) {
               let routeStrs: string[] = [];
               let coordsStrs: string[] = [];
               if (routeLog && routeLog.abt && routeLog.abt.description) {
                   const abtDesc = routeLog.abt.description.replace('Transport during shift:\\n', '');
                   const abtParts = abtDesc.split(' → ');
                   let waypoints: string[] = [];
                   abtParts.forEach((partStr: string) => {
                       const loc = parseLocationString(partStr);
                       const locName = loc.name ? loc.name + (loc.address ? \` (\${loc.address})\` : '') : (loc.address || 'Unknown');
                       waypoints.push(locName);
                       if (loc.coords) coordsStrs.push(loc.coords);
                   });
                   if (waypoints.length > 0) {
                       routeStrs.push('From: ' + waypoints.join('\\nTo: '));
                   }
               }
               entries.push({
                   routeStr: routeStrs.join('\\n'),
                   cat: 'Activity Transport',
                   km: s.abt_km,
                   coords: coordsStrs.join('\\n') || 'N/A'
               });
            }

            entries.forEach((e, idx) => {
               if (doc.y > 650) { 
                  doc.addPage(); 
               }
               let rowStartY = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(idx === 0 ? startTz.date : '', 55, rowStartY, { width: 45 });
               doc.text(idx === 0 ? \`\${s.staff_first} \${s.staff_last}\` : '', 105, rowStartY, { width: 70 });
               const rowH1 = doc.y;
               doc.text(e.routeStr, 180, rowStartY, { width: 150 });
               doc.font('Helvetica').fontSize(7).text(e.coords, 180, doc.y + 2, { width: 150 });
               const rowH2 = doc.y;
               
               doc.font('Helvetica').fontSize(8);
               doc.text(e.cat, 340, rowStartY, { width: 75 });
               doc.text(e.km.toFixed(2), 420, rowStartY, { width: 25 });
               
               doc.y = Math.max(rowStartY + 10, rowH1, rowH2) + 5;
            });
            // Divider
            doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).strokeColor('#e4e4e7').stroke();
            doc.y += 5;
        }
      });
      doc.end();`;

if (regexEvidencePack.test(content)) {
    const newContent = content.replace(regexEvidencePack, replacementEvidencePack);
    fs.writeFileSync('server.ts', newContent);
    console.log("Replaced Evidence Pack PDF block");
} else {
    console.log("Could not find regexEvidencePack in server.ts");
}
