const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('test_logo_fit.pdf'));

const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64Data, 'base64');

// Invoice way
doc.image(buffer, 50, 40, { height: 50 });

// Quote way
doc.image(buffer, doc.page.width - 50 - 150, 40, { fit: [150, 70], align: "right" });

doc.end();
