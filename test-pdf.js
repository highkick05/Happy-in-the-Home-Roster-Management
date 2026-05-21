const fs = require('fs');
const PDFDocument = require('pdfkit');

try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let currentY = 100;
      let boxX = 40;
      let col1W = 100;
      let boxW = 400;
      const docStream = fs.createWriteStream('test.pdf');
      doc.pipe(docStream);

      doc.font('Helvetica-Bold').fontSize(24).text('PROGRESS NOTES', 40, 40);
      
      const note = {
        notes: "Some notes",
        start_time: "2026-05-01T10:00:00Z"
      };

      const startDate = new Date(note.start_time);
      const dateStr = startDate.toLocaleDateString('en-GB');

      doc.end();
      console.log('PDF generated OK');
} catch (e) {
      console.error(e);
}
