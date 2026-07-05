const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('test_logo2.pdf'));

const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64Data, 'base64');
doc.image(buffer, doc.page.width - 50 - 150, 40, { fit: [150, 70], align: "right" });
doc.fontSize(24).text("SERVICE QUOTE", 50, 50);
doc.end();
