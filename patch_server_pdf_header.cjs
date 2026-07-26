const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const \{ startDate, view, shifts, groupBy \} = req\.body;[\s\S]*?doc\.moveDown\(1\);/;

const replacementStr = `const { startDate, view, shifts, groupBy, filterName } = req.body;
        
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', \`attachment; filename="Roster.pdf"\`);
        doc.pipe(res);

        const startDt = new Date(startDate);
        const day = startDt.getDay();
        const diff = startDt.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(startDt.setDate(diff));
        
        const sundayEnd = new Date(monday);
        sundayEnd.setDate(sundayEnd.getDate() + 6);
        sundayEnd.setHours(23,59,59,999);

        const formatDate = (date) => {
           const d = date.getDate().toString().padStart(2, '0');
           const m = (date.getMonth() + 1).toString().padStart(2, '0');
           const y = date.getFullYear();
           return \`\${d}/\${m}/\${y}\`;
        };

        const titleText = filterName ? \`\${filterName} - Roster\` : \`Roster\`;
        const subTitleText = \`\${formatDate(monday)} to \${formatDate(sundayEnd)}\`;
        
        doc.fontSize(16).fillColor('#000000').text(titleText, { align: 'center' });
        doc.fontSize(12).fillColor('#555555').text(subTitleText, { align: 'center' });
        doc.moveDown(1);`;

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched PDF header in server.ts!');
} else {
    console.log('Regex did not match!');
}
