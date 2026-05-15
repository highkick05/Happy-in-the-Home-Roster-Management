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
            
            if (s.provider_travel_km > 0 || s.home_care_travel_km > 0) {
               let fromStr = 'Unknown';
               let toStr = 'Unknown';
               let coords = '';
               if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
                   const leg = routeLog.providerTravel.legs[0]; 
                   if (leg && leg.description && leg.description.includes(' to ')) {
                       const [f, t] = leg.description.split(' to ');
                       const fl = parseLocationString(f);
                       const tl = parseLocationString(t);
                       fromStr = fl.name || leg.fromName || 'Previous Client / Home';
                       toStr = tl.name || leg.toName || 'Client Location';
                       if (fl.coords) coords += \`From: \${fl.coords}\\n\`;
                       if (tl.coords) coords += \`To: \${tl.coords}\`;
                   } else if (leg) {
                       fromStr = leg.fromName || 'Previous Client / Home';
                       toStr = leg.toName || 'Client Location';
                   }
               }
               
               if (s.provider_travel_km > 0) {
                   entries.push({
                       routeStr: \`From: \${fromStr}\\nTo: \${toStr}\`,
                       cat: 'Provider Travel',
                       km: s.provider_travel_km,
                       coords: coords || 'N/A'
                   });
               }
               if (s.home_care_travel_km > 0) {
                   entries.push({
                       routeStr: \`From: \${fromStr}\\nTo: \${toStr}\`,
                       cat: 'Home Care Travel',
                       km: s.home_care_travel_km,
                       coords: coords || 'N/A'
                   });
               }
            }

            if (s.abt_km > 0) {
               let routeStr = 'ABT Route';
               let coords = '';
               if (routeLog && routeLog.abt && routeLog.abt.description) {
                   const abtDesc = routeLog.abt.description.replace('Transport during shift:\\n', '');
                   const abtParts = abtDesc.split(' → ');
                   let waypoints: string[] = [];
                   abtParts.forEach((partStr: string) => {
                       const loc = parseLocationString(partStr);
                       waypoints.push(loc.name || loc.address || 'Unknown');
                       if (loc.coords) coords += \`\${loc.coords}\\n\`;
                   });
                   routeStr = waypoints.join('\\nTo: ');
                   if (routeStr.length > 0) routeStr = 'From: ' + routeStr;
               }
               entries.push({
                   routeStr: routeStr,
                   cat: 'Activity Transport',
                   km: s.abt_km,
                   coords: coords.trim() || 'N/A'
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
               doc.font('Helvetica').fontSize(7).text(e.coords, 180, doc.y, { width: 150 });
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
