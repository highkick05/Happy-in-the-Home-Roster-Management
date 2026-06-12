const fs = require('fs');

let code = fs.readFileSync('src/server.ts', 'utf8');

// 1. Update logo addition (top right, smaller, don't move Y down)
const oldLogoDec = `      const addLogo = () => {
        if (logoUrl) {
          try {
            const logoFilename = logoUrl.split('/').pop();
            const logoPath = require('path').join(assetsDir, logoFilename);
            if (require('fs').existsSync(logoPath)) {
              doc.image(logoPath, 40, 40, { width: 150 });
              doc.moveDown(4);
            }
          } catch (err) {}
        }
      };`;

const newLogoDec = `      const addLogo = () => {
        if (logoUrl) {
          try {
            const logoFilename = logoUrl.split('/').pop();
            const logoPath = require('path').join(assetsDir, logoFilename);
            if (require('fs').existsSync(logoPath)) {
              doc.image(logoPath, doc.page.width - 40 - 120, 40, { width: 120 });
              // We do NOT modify doc.y, so standard text on the left stays at the top.
            }
          } catch (err) {}
        }
      };`;

code = code.replace(oldLogoDec, newLogoDec);

// 2. Adjust "Letter of Offer" to be larger and left-aligned, so it doesn't overlap logo
// Old: doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text('Letter of Offer', { align: 'right' });
const oldLetterTitle = `      // --- PAGE 1: LETTER OF OFFER ---
      addLogo();
      // Header
      doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text('Letter of Offer', { align: 'right' });`;

const newLetterTitle = `      // --- PAGE 1: LETTER OF OFFER ---
      addLogo();
      // Reset Y to top for left column
      doc.y = 40;
      // Header
      doc.font('Helvetica-Bold').fontSize(22).fillColor(primaryColor).text('Letter of Offer');`;

code = code.replace(oldLetterTitle, newLetterTitle);

// 3. Similarly for the third page Employment Contract title
// Old:
//      // --- PAGE 3: EMPLOYMENT CONTRACT START ---
//      doc.addPage();
//      addLogo();
//      doc.font('Helvetica-Bold').fontSize(22).text('Employment Contract');

const oldContractTitle = `      // --- PAGE 3: EMPLOYMENT CONTRACT START ---
      doc.addPage();
      addLogo();
      doc.font('Helvetica-Bold').fontSize(22).text('Employment Contract');`;

const newContractTitle = `      // --- PAGE 3: EMPLOYMENT CONTRACT START ---
      doc.addPage();
      addLogo();
      doc.y = 40;
      doc.font('Helvetica-Bold').fontSize(22).text('Employment Contract');`;

code = code.replace(oldContractTitle, newContractTitle);


// 4. Update Footer Pagination to truly center across page
const oldPagination = `        doc.text(\`Page \${i + 1} of \${range.count}\`, 0, doc.page.height - 30, { align: 'center', lineBreak: false });`;
const newPagination = `        doc.text(\`Page \${i + 1} of \${range.count}\`, 0, doc.page.height - 30, { align: 'center', width: doc.page.width, lineBreak: false });`;

code = code.replace(oldPagination, newPagination);

fs.writeFileSync('src/server.ts', code);
console.log('Update Complete');
