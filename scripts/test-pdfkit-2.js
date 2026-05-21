import fs from 'fs';
import PDFDocument from 'pdfkit';

const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 20, left: 40, right: 40 }, autoFirstPage: true, bufferPages: true });
const docStream = fs.createWriteStream('test-3.pdf');
doc.pipe(docStream);

console.log('page height', doc.page.height);
console.log('page width', doc.page.width);

const boxX = 40;
const boxY = 40;
const boxW = doc.page.width - 80;
const headerH = 80;

const usableH = doc.page.height - 90;
doc.lineWidth(1).rect(boxX, boxY, boxW, usableH).stroke();

doc.font('Helvetica').fontSize(6).fillColor('gray');
doc.text(`PAGE 1`, 40, doc.page.height - 35);
doc.text('© COPYRIGHT', 0, doc.page.height - 35, { align: 'right', width: doc.page.width - 40 });

doc.end();

docStream.on('finish', () => {
  console.log('pages:', doc.bufferedPageRange().count);
});
