const fs = require('fs');

const serverFile = 'src/server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const injectionPoint = '// Get shifts by batch id';

const newRoute = `
  app.post(
    "/api/roster/print",
    authenticateToken,
    requireAdmin,
    (req, res) => {
      try {
        const { startDate, view, shifts, groupBy } = req.body;
        
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', \`attachment; filename="Roster.pdf"\`);
        doc.pipe(res);

        const startDt = new Date(startDate);
        const day = startDt.getDay();
        const diff = startDt.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(startDt.setDate(diff));
        
        doc.fontSize(16).fillColor('#000000').text(\`Roster - Week of \${monday.toLocaleDateString()}\`, { align: 'center' });
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
        
        (shifts || []).forEach(shift => {
          const shiftDate = new Date(shift.start);
          let d = shiftDate.getDay();
          d = d === 0 ? 6 : d - 1; // Mon=0, Sun=6
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
                const sStart = new Date(shift.start).toLocaleTimeString(['en-US', 'en-AU'], { hour: '2-digit', minute: '2-digit' });
                const sEnd = new Date(shift.end).toLocaleTimeString(['en-US', 'en-AU'], { hour: '2-digit', minute: '2-digit' });
                const timeText = \`\${sStart} - \${sEnd}\`;
                
                let namesText = groupBy === 'STAFF' 
                  ? \`\${shift.clientName || 'Unassigned'} (\${shift.staffName || 'Unassigned'})\` 
                  : \`\${shift.staffName || 'Unassigned'} (\${shift.clientName || 'Unassigned'})\`;
                
                if (shift.title) {
                   namesText = shift.title; // Fallback for things like Respite
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
                const sStart = new Date(shift.start).toLocaleTimeString(['en-US', 'en-AU'], { hour: '2-digit', minute: '2-digit' });
                const sEnd = new Date(shift.end).toLocaleTimeString(['en-US', 'en-AU'], { hour: '2-digit', minute: '2-digit' });
                const timeText = \`\${sStart} - \${sEnd}\`;
                
                let namesText = groupBy === 'STAFF' 
                  ? \`\${shift.clientName || 'Unassigned'} (\${shift.staffName || 'Unassigned'})\` 
                  : \`\${shift.staffName || 'Unassigned'} (\${shift.clientName || 'Unassigned'})\`;

                if (shift.title) {
                   namesText = shift.title;
                }
                
                // Color mapping like frontend
                let bgColor = '#0ea5e9'; // brand-blue
                if (shift.id && typeof shift.id === 'string' && shift.id.startsWith('rb_')) bgColor = '#f59e0b';
                else if (shift.status === 'PUBLISHED') bgColor = '#10b981';
                else if (shift.status === 'COMPLETED') bgColor = '#6366f1';
                else if (shift.status === 'CANCELLED') bgColor = '#ef4444';
                else if (shift.status === 'IN_PROGRESS') bgColor = '#3b82f6';
                
                doc.fillColor(bgColor).rect(30 + d * colWidth + 2, currentY, colWidth - 4, rowMaxHeight).fill();
                doc.fillColor('#ffffff').fontSize(8);
                doc.text(timeText, 30 + d * colWidth + 4, currentY + 4, { width: colWidth - 8 });
                doc.text(namesText, 30 + d * colWidth + 4, currentY + 4 + doc.heightOfString(timeText, { width: colWidth - 8 }), { width: colWidth - 8 });
             }
           }
           
           currentY += rowMaxHeight + 4;
        }
        
        doc.end();
      } catch (e) {
        console.error(\`API Error: \${e}\`);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
    },
  );

`;

code = code.replace(injectionPoint, newRoute + '\n  ' + injectionPoint);
fs.writeFileSync(serverFile, code);
console.log('Patched server.ts successfully.');
