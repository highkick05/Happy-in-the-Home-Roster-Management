import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const regexStaffLogbook = /\/\/ Section 2: Vehicle Usage Statement[\s\S]*?doc\.end\(\);/m;

const replacementStaffLogbook = `// Section 2: Vehicle Usage Statement
      doc.fontSize(16).font('Helvetica-Bold').text('2. Vehicle Usage Statement');
      doc.moveDown();
      let totalProviderKm = 0;
      let totalAbtKm = 0;
      let totalHcKm = 0;

      // Table Header
      const headerY = doc.y;
      doc.rect(50, headerY - 5, 500, 20).fill('#f4f4f5');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
      doc.text('Date', 55, headerY);
      doc.text('Client', 105, headerY);
      doc.text('Travel Route', 180, headerY);
      doc.text('Category', 340, headerY);
      doc.text('KM', 420, headerY);
      doc.text('Odo', 450, headerY);
      doc.y = headerY + 20;

      shifts.forEach((s) => {
        let rowsToPrint: any[] = [];
        
        // Parse transport_route_log to get address/coords
        let routeLog: any = null;
        if (s.transport_route_log) {
            try { routeLog = JSON.parse(s.transport_route_log); } catch(e){}
        }
        
        let providerRouteStr = 'Unknown';
        let providerCoords = 'N/A';
        if (routeLog && routeLog.providerTravel && routeLog.providerTravel.legs) {
           const leg = routeLog.providerTravel.legs[0]; 
           if (leg && leg.description && leg.description.includes(' to ')) {
               const [f, t] = leg.description.split(' to ');
               const fl = parseLocationString(f);
               const tl = parseLocationString(t);
               providerRouteStr = \`From: \${fl.name || leg.fromName || 'Unknown'}\\nTo: \${tl.name || leg.toName || 'Client'}\`;
               let coordsArr = [];
               if (fl.coords) coordsArr.push(\`F: \${fl.coords}\`);
               if (tl.coords) coordsArr.push(\`T: \${tl.coords}\`);
               providerCoords = coordsArr.join('\\n');
           } else if (leg) {
               providerRouteStr = \`From: \${leg.fromName || 'Unknown'}\\nTo: \${leg.toName || 'Client'}\`;
           }
        }

        let abtRouteStr = 'Activity Transport';
        let abtCoords = 'N/A';
        if (routeLog && routeLog.abt && routeLog.abt.description) {
           const abtDesc = routeLog.abt.description.replace('Transport during shift:\\n', '');
           const abtParts = abtDesc.split(' → ');
           let waypoints: string[] = [];
           let coordsArr: string[] = [];
           abtParts.forEach((partStr: string) => {
               const loc = parseLocationString(partStr);
               waypoints.push(loc.name || loc.address || 'Unknown');
               if (loc.coords) coordsArr.push(loc.coords);
           });
           abtRouteStr = 'From: ' + waypoints.join('\\nTo: ');
           if (coordsArr.length > 0) abtCoords = coordsArr.join('\\n');
        }

        if (s.provider_travel_km > 0) {
           rowsToPrint.push({ cat: 'Provider Travel', km: s.provider_travel_km, route: providerRouteStr, coords: providerCoords });
           totalProviderKm += s.provider_travel_km;
        }
        if (s.home_care_travel_km > 0) {
           rowsToPrint.push({ cat: 'Home Care ($1/km)', km: s.home_care_travel_km, route: providerRouteStr, coords: providerCoords });
           totalHcKm += s.home_care_travel_km;
        }
        if (s.abt_km > 0) {
           rowsToPrint.push({ cat: 'ABT (NDIS)', km: s.abt_km, route: abtRouteStr, coords: abtCoords });
           totalAbtKm += s.abt_km;
        }

        if (rowsToPrint.length === 0 && (s.odometer_start_reading || s.odometer_end_reading || s.odometer_start_photo || s.odometer_end_photo)) {
           rowsToPrint.push({ cat: 'Odometer Record', km: 0, route: 'N/A', coords: 'N/A' });
        }

        if (rowsToPrint.length > 0) {
           const startTz = formatTz(s.actual_start_time, s.start_time);
           
           rowsToPrint.forEach((row, idx) => {
               if (doc.y > 650) {
                  doc.addPage();
               }
               
               let rowStartY = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(idx === 0 ? startTz.date : '', 55, rowStartY, { width: 45 });
               doc.text(idx === 0 ? \`\${s.client_first} \${s.client_last}\` : '', 105, rowStartY, { width: 70 });
               
               const rowH1 = doc.y;
               doc.text(row.route, 180, rowStartY, { width: 150 });
               doc.font('Helvetica').fontSize(7).text(row.coords, 180, doc.y, { width: 150 });
               
               const hAfterRoute = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(row.cat, 340, rowStartY, { width: 75 });
               doc.text(row.km.toFixed(2), 420, rowStartY, { width: 25 });
               
               if (idx === 0) {
                   const startOdo = s.odometer_start_reading || 'N/A';
                   const endOdo = s.odometer_end_reading || 'N/A';
                   doc.text(\`\${startOdo}-\${endOdo}\`, 450, rowStartY, { width: 100 });
               }
               
               doc.y = Math.max(rowStartY + 12, hAfterRoute + 5);
           });

           if (s.odometer_start_photo || s.odometer_end_photo) {
               if (doc.y > 600) { doc.addPage(); } 
               
               doc.moveDown(0.5);
               let imgHeight = 0;
               const currentY = doc.y;
               doc.fillColor('black');
               if (s.odometer_start_photo && s.odometer_start_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_start_photo.replace(/^data:image\/\w+;base64,/, "");
                     const imgBuffer = Buffer.from(base64Data, 'base64');
                     doc.fontSize(7).font('Helvetica-Oblique').text('Start Odo:', 200, currentY);
                     doc.image(imgBuffer, 200, currentY + 10, { height: 60 });
                     imgHeight = 70;
                  } catch(e){}
               }
               
               if (s.odometer_end_photo && s.odometer_end_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_end_photo.replace(/^data:image\/\w+;base64,/, "");
                     const imgBuffer = Buffer.from(base64Data, 'base64');
                     doc.fontSize(7).font('Helvetica-Oblique').text('End Odo:', 360, currentY);
                     doc.image(imgBuffer, 360, currentY + 10, { height: 60 });
                     imgHeight = 70;
                  } catch(e){}
               }
               
               if (imgHeight > 0) {
                  doc.y = currentY + imgHeight + 15;
               }
           }
           
           doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).strokeColor('#e4e4e7').stroke();
           doc.y += 5;
        }
      });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
      doc.text(\`Total Provider Travel (NDIS): \${totalProviderKm.toFixed(2)} km\`);
      doc.text(\`Total Home Care Travel: \${totalHcKm.toFixed(2)} km\`);
      doc.text(\`Total ABT (NDIS): \${totalAbtKm.toFixed(2)} km\`);

      doc.end();`;

if (regexStaffLogbook.test(content)) {
    const newContent = content.replace(regexStaffLogbook, replacementStaffLogbook);
    fs.writeFileSync('server.ts', newContent);
    console.log("Replaced Staff Logbook PDF block");
} else {
    console.log("Could not find regexStaffLogbook in server.ts");
}
