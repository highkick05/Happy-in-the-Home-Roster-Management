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
      doc.text('Client', 115, headerY);
      doc.text('Travel Category', 200, headerY);
      doc.text('KM', 320, headerY);
      doc.text('Odometer (Start - End)', 360, headerY);
      doc.y = headerY + 20;

      shifts.forEach((s) => {
        let rowsToPrint: any[] = [];
        
        if (s.provider_travel_km > 0) {
           rowsToPrint.push({ cat: 'Provider Travel (NDIS)', km: s.provider_travel_km });
           totalProviderKm += s.provider_travel_km;
        }
        if (s.home_care_travel_km > 0) {
           rowsToPrint.push({ cat: 'Home Care Travel ($1.00/km)', km: s.home_care_travel_km });
           totalHcKm += s.home_care_travel_km;
        }
        if (s.abt_km > 0) {
           rowsToPrint.push({ cat: 'ABT (NDIS)', km: s.abt_km });
           totalAbtKm += s.abt_km;
        }

        // Even if KM is 0, if there are photos or odometer readings, print a row so we can show them
        if (rowsToPrint.length === 0 && (s.odometer_start_reading || s.odometer_end_reading || s.odometer_start_photo || s.odometer_end_photo)) {
           rowsToPrint.push({ cat: 'Odometer Record', km: 0 });
        }

        if (rowsToPrint.length > 0) {
           const startTz = formatTz(s.actual_start_time, s.start_time);
           
           rowsToPrint.forEach((row, idx) => {
               // Pagination safeguard
               if (doc.y > 700) {
                  doc.addPage();
               }
               
               let rowStartY = doc.y;
               doc.font('Helvetica').fontSize(8);
               doc.text(idx === 0 ? startTz.date : '', 55, rowStartY, { width: 60 });
               doc.text(idx === 0 ? \`\${s.client_first} \${s.client_last}\` : '', 115, rowStartY, { width: 80 });
               doc.text(row.cat, 200, rowStartY, { width: 110 });
               doc.text(row.km.toFixed(2), 320, rowStartY, { width: 35 });
               
               if (idx === 0) {
                   const startOdo = s.odometer_start_reading || 'N/A';
                   const endOdo = s.odometer_end_reading || 'N/A';
                   doc.text(\`\${startOdo} - \${endOdo}\`, 360, rowStartY, { width: 180 });
               }
               
               // Move doc.y down to account for text
               doc.y = Math.max(doc.y, rowStartY + 12);
           });

           // Odometer Photos - drawn after the rows for this shift
           if (s.odometer_start_photo || s.odometer_end_photo) {
               // Check if image space needed
               if (doc.y > 600) { doc.addPage(); } // require more space for images
               
               doc.moveDown(0.5);
               let imgHeight = 0;
               const currentY = doc.y;
               doc.fillColor('black');
               if (s.odometer_start_photo && s.odometer_start_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_start_photo.replace(/^data:image\\/\\w+;base64,/, "");
                     const imgBuffer = Buffer.from(base64Data, 'base64');
                     doc.fontSize(7).font('Helvetica-Oblique').text('Start Odo:', 200, currentY);
                     doc.image(imgBuffer, 200, currentY + 10, { height: 60 });
                     imgHeight = 70;
                  } catch(e){}
               }
               
               if (s.odometer_end_photo && s.odometer_end_photo.startsWith('data:image/')) {
                  try {
                     const base64Data = s.odometer_end_photo.replace(/^data:image\\/\\w+;base64,/, "");
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
           
           // Divider line between shifts
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
