const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// 1. Inject Logo logic and base font size config
const oldTop = `      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', \`attachment; filename="Employment_Contract_\${staffName.replace(/\\\\s+/g, '_')}.pdf"\`);
      
      doc.pipe(res);

      let totalPages = 0;
      doc.on('pageAdded', () => {
        totalPages++;
      });
      totalPages = 1; // Initial page

      // Colors & Fonts
      const primaryColor = '#000000';
      const secondaryColor = '#4a4a4a';

      // --- PAGE 1: LETTER OF OFFER ---
      // Header
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text('Letter of offer', { align: 'right' });`;

const newTop = `      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', \`attachment; filename="Employment_Contract_\${staffName.replace(/\\\\s+/g, '_')}.pdf"\`);
      
      doc.pipe(res);

      // Logo Support
      const settingsTable = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?').get('letterheadLogo');
      const logoUrl = settingsTable?.setting_value;
      const addLogo = () => {
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
      };

      // Colors & Fonts
      const primaryColor = '#000000';
      const secondaryColor = '#4a4a4a';

      // --- PAGE 1: LETTER OF OFFER ---
      addLogo();
      // Header
      doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text('Letter of Offer', { align: 'right' });`;

code = code.replace(oldTop, newTop);

// 2. Increase base font size from 10 to 11
// We need to do this carefully so we don't affect other parts of server.ts
// The generation code block starts at: `// --- PDF Contract Generation Route ---`
const startIndex = code.indexOf('// --- PDF Contract Generation Route ---');
const endIndex = code.indexOf('// --- Vite Middleware or Static Files ---');

let contractCode = code.substring(startIndex, endIndex);

contractCode = contractCode.replace(/\.fontSize\(10\)/g, '.fontSize(11)');
contractCode = contractCode.replace(/\.fontSize\(12\)/g, '.fontSize(13)');
contractCode = contractCode.replace(/\.fontSize\(14\)/g, '.fontSize(15)');

// 3. Employment Contract main header
contractCode = contractCode.replace(
  `doc.font('Helvetica-Bold').fontSize(18).text('Employment contract');`,
  `addLogo();\n      doc.font('Helvetica-Bold').fontSize(22).text('Employment Contract');`
);

// 4. Move position description to Position Section
const oldPosition = `      // Section: Position
      doc.font('Helvetica-Bold').fontSize(15).text('Position');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(\`You are being employed in the position of \${positionTitle}.\`);
      doc.moveDown(0.5);
      doc.text(\`You are being employed on a \${employmentType.toLowerCase()} basis, as required.\`);
      doc.moveDown(1);
      
      if (employmentType === 'Casual') {`;

const newPosition = `      // Section: Position
      doc.font('Helvetica-Bold').fontSize(15).text('Position');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(\`You are being employed in the position of \${positionTitle}.\`);
      doc.moveDown(0.5);
      doc.text(\`You are being employed on a \${employmentType.toLowerCase()} basis, as required.\`);
      doc.moveDown(1);
      
      if (positionDescription) {
        doc.font('Helvetica-Bold').fontSize(13).text('Position Description');
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(11).text(positionDescription);
        doc.moveDown(1);
      }
      
      if (employmentType === 'Casual') {`;

contractCode = contractCode.replace(oldPosition, newPosition);

// 5. Remove Appendix Position Description
const appendixStr = `      // Appendix: Position Description
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(16).text('Position Description');
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(11).text(positionDescription);`;

contractCode = contractCode.replace(appendixStr, '');

// 6. Fix Pagination Loop (prevent new line adding a page)
const oldPagination = `      // Add page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(8).fillColor('#888888');
        doc.text(\`Page \${i + 1} of \${range.count}\`, 0, doc.page.height - 30, { align: 'center' });
      }`;

const newPagination = `      // Add page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // Temporarily disable bottom margin to avoid unwanted new pages
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(9).fillColor('#888888');
        doc.text(\`Page \${i + 1} of \${range.count}\`, 0, doc.page.height - 30, { align: 'center', lineBreak: false });
        doc.page.margins.bottom = oldBottom;
      }`;

contractCode = contractCode.replace(oldPagination, newPagination);


code = code.substring(0, startIndex) + contractCode + code.substring(endIndex);

fs.writeFileSync('src/server.ts', code);
console.log("Done");
