const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 40, size: 'A4' });
doc.pipe(fs.createWriteStream('test_logo.pdf'));

// create a dummy image
const { createCanvas } = require('canvas');
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('200');
// wait, we don't have canvas. We can just use an existing asset if any.
