const PDFDocument = require('pdfkit');
const fs = require('fs');
const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
doc.pipe(fs.createWriteStream('test_loop.pdf'));
doc.text('Hello');
doc.addPage();
doc.text('Page 2');

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.text(`Page ${i + 1}`, 0, doc.page.height - 30);
}
doc.end();
