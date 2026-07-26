const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const \{ startDate, view, shifts, groupBy, filterName \} = req\.body;[\s\S]*?let bgColor = '#0ea5e9'; \/\/ brand-blue/m;

const replacementStr = `const { startDate, endDate, timeZone, view, shifts, groupBy, filterName } = req.body;
        const tz = timeZone || 'Australia/Sydney';
        
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', \`attachment; filename="Roster.pdf"\`);
        doc.pipe(res);

        const formatDate = (dateString) => {
           const d = new Date(dateString);
           return new Intl.DateTimeFormat('en-AU', { 
               timeZone: tz, 
               day: '2-digit', 
               month: '2-digit', 
               year: 'numeric' 
           }).format(d);
        };

        const titleText = filterName ? \`\${filterName} - Roster\` : \`Roster\`;
        const subTitleText = \`\${formatDate(startDate)} to \${formatDate(endDate || startDate)}\`;
        
        doc.fontSize(16).fillColor('#000000').text(titleText, { align: 'center' });
        doc.fontSize(12).fillColor('#555555').text(subTitleText, { align: 'center' });
        doc.moveDown(1);
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const colWidth = (doc.page.width - 60) / 7;
        let startY = doc.y;
        
        const drawHeader = () => {
          doc.fillColor('#000000').fontSize(11);
          days.forEach((d, i) => {
            doc.text(d, 30 + i * colWidth, startY, { width: colWidth, align: 'center' });
          });
          doc.moveTo(30, startY + 15).lineTo(doc.page.width - 30, startY + 15).strokeColor('#cccccc').stroke();
          startY += 20;
        };
        
        drawHeader();
        
        const shiftsByDay = Array(7).fill(null).map(() => []);
        
        const thisWeekShifts = shifts || [];

        thisWeekShifts.forEach(shift => {
          const shiftDate = new Date(shift.start);
          const weekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(shiftDate);
          const daysMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
          let d = daysMap[weekdayStr];
          
          if (d >= 0 && d <= 6) {
             shiftsByDay[d].push(shift);
          }
        });
        
        shiftsByDay.forEach(dayShifts => {
           dayShifts.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        });
        
        const maxShifts = Math.max(...shiftsByDay.map(d => d.length));
        let currentY = startY;
        
        for (let i = 0; i < maxShifts; i++) {
           let rowMaxHeight = 0;
           
           // Calculate max height for this row
           for (let d = 0; d < 7; d++) {
             const shift = shiftsByDay[d][i];
             if (shift) {
                const sStart = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shift.start));
                const sEnd = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shift.end));
                const timeText = \`\${sStart} - \${sEnd}\`;
                
                let namesText = groupBy === 'STAFF' 
                  ? \`\${shift.clientName || 'Unassigned'} (\${shift.staffName || 'Unassigned'})\` 
                  : \`\${shift.staffName || 'Unassigned'} (\${shift.clientName || 'Unassigned'})\`;
                
                if (shift.title && (shift.isRespiteWrapper || shift.title.includes('Respite') || shift.title.includes('STA'))) {
                   namesText = shift.title;
                }

                doc.fontSize(8);
                const tHeight = doc.heightOfString(timeText, { width: colWidth - 8 });
                const nHeight = doc.heightOfString(namesText, { width: colWidth - 8 });
                const boxH = tHeight + nHeight + 12;
                if (boxH > rowMaxHeight) rowMaxHeight = boxH;
             }
           }
           
           if (rowMaxHeight === 0) continue;
           
           if (currentY + rowMaxHeight > doc.page.height - 30) {
              doc.addPage();
              startY = 30;
              drawHeader();
              currentY = startY;
           }
           
           for (let d = 0; d < 7; d++) {
             const shift = shiftsByDay[d][i];
             if (shift) {
                const sStart = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shift.start));
                const sEnd = new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shift.end));
                const timeText = \`\${sStart} - \${sEnd}\`;
                
                let namesText = groupBy === 'STAFF' 
                  ? \`\${shift.clientName || 'Unassigned'} (\${shift.staffName || 'Unassigned'})\` 
                  : \`\${shift.staffName || 'Unassigned'} (\${shift.clientName || 'Unassigned'})\`;

                if (shift.title && (shift.isRespiteWrapper || shift.title.includes('Respite') || shift.title.includes('STA'))) {
                   namesText = shift.title;
                }
                
                // Color mapping like frontend
                let bgColor = '#0ea5e9'; // brand-blue`;

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched server.ts final!');
} else {
    console.log('Regex did not match!');
}
