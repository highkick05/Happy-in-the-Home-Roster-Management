const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('test_logo3.pdf'));

const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64Data, 'base64');
doc.image(buffer, 50, 40, { width: doc.page.width - 100, height: 50, align: "right" });
doc.fontSize(24).text("SERVICE QUOTE", 50, 50);
doc.end();
