import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import PDFDocument from 'pdfkit';

let cachedFeatheredPagePng: Buffer | null = null;

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const out = Buffer.allocUnsafe(len + 12);
  out.writeUInt32BE(len, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(out.subarray(4, 8 + len));
  out.writeUInt32BE(crc, 8 + len);
  return out;
}

function evalGradientStops(t: number, stops: [number, number][]): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, v0] = stops[i - 1];
      const [t1, v1] = stops[i];
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

function getFeatheredPageBgPngBuffer(): Buffer | null {
  if (cachedFeatheredPagePng) return cachedFeatheredPagePng;
  try {
    const candidates = [
      path.join(process.cwd(), 'public', 'hith houses for folder.png'),
      path.join(process.cwd(), 'dist', 'hith houses for folder.png'),
      path.join(process.cwd(), 'public', 'assets', 'aistudio', 'hith_houses_for_folder_3df6b648.png'),
      path.join(process.cwd(), 'dist', 'assets', 'aistudio', 'hith_houses_for_folder_3df6b648.png'),
    ];
    let rawFile: Buffer | null = null;
    for (const bgPath of candidates) {
      if (fs.existsSync(bgPath)) {
        rawFile = fs.readFileSync(bgPath);
        break;
      }
    }
    if (!rawFile) return null;

    let offset = 8, srcW = 0, srcH = 0;
    const idat: Buffer[] = [];
    while (offset < rawFile.length) {
      const len = rawFile.readUInt32BE(offset);
      const type = rawFile.toString('ascii', offset + 4, offset + 8);
      const data = rawFile.subarray(offset + 8, offset + 8 + len);
      if (type === 'IHDR') {
        srcW = data.readUInt32BE(0);
        srcH = data.readUInt32BE(4);
      } else if (type === 'IDAT') {
        idat.push(data);
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + len;
    }
    if (!srcW || !srcH || idat.length === 0) return null;

    const inflated = zlib.inflateSync(Buffer.concat(idat));
    const bpp = 4;
    const stride = srcW * bpp;
    const pixels = Buffer.allocUnsafe(srcH * stride);
    const paeth = (a: number, b: number, c: number) => {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
    };
    for (let y = 0; y < srcH; y++) {
      const filter = inflated[y * (stride + 1)];
      const srcRow = y * (stride + 1) + 1;
      const dstRow = y * stride;
      for (let i = 0; i < stride; i++) {
        const x = inflated[srcRow + i];
        const a = i >= bpp ? pixels[dstRow + i - bpp] : 0;
        const b = y > 0 ? pixels[dstRow - stride + i] : 0;
        const c = (y > 0 && i >= bpp) ? pixels[dstRow - stride + i - bpp] : 0;
        let val = x;
        if (filter === 1) val = (x + a) & 0xff;
        else if (filter === 2) val = (x + b) & 0xff;
        else if (filter === 3) val = (x + ((a + b) >> 1)) & 0xff;
        else if (filter === 4) val = (x + paeth(a, b, c)) & 0xff;
        pixels[dstRow + i] = val;
      }
    }

    const pageW = 893;
    const pageH = 1263;
    const rawOut = Buffer.allocUnsafe(pageH * (1 + pageW * 3));
    rawOut.fill(255);
    for (let y = 0; y < pageH; y++) {
      rawOut[y * (1 + pageW * 3)] = 0;
    }

    const bands: {
      yStartPt: number;
      heightPt: number;
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      opacity: number;
      stops: [number, number][];
    }[] = [
      { yStartPt: -24, heightPt: 360, cx: 0.85, cy: 0.25, rx: 0.95, ry: 0.75, opacity: 0.26, stops: [[0.15, 1.0], [0.45, 0.60], [0.72, 0.20], [0.96, 0.0]] },
      { yStartPt: 235, heightPt: 360, cx: 0.15, cy: 0.50, rx: 0.95, ry: 0.70, opacity: 0.22, stops: [[0.15, 1.0], [0.45, 0.55], [0.72, 0.18], [0.96, 0.0]] },
      { yStartPt: 514, heightPt: 360, cx: 0.85, cy: 0.75, rx: 0.95, ry: 0.75, opacity: 0.26, stops: [[0.15, 1.0], [0.45, 0.60], [0.72, 0.20], [0.96, 0.0]] },
    ];

    for (const band of bands) {
      const y0 = Math.max(0, Math.floor((band.yStartPt / 841.89) * pageH));
      const y1 = Math.min(pageH, Math.ceil(((band.yStartPt + band.heightPt) / 841.89) * pageH));
      const bandHPx = (band.heightPt / 841.89) * pageH;
      const bandY0Px = (band.yStartPt / 841.89) * pageH;

      const scaleX = srcW / pageW;
      const scaleY = srcH / bandHPx;
      const scale = Math.min(scaleX, scaleY);
      const cropW = pageW * scale;
      const cropH = bandHPx * scale;
      const cropX0 = (srcW - cropW) / 2;
      const cropY0 = (srcH - cropH) / 2;

      for (let py = y0; py < y1; py++) {
        const v = (py - bandY0Px) / bandHPx;
        const dy = (v - band.cy) / band.ry;
        const sy = Math.min(srcH - 1, Math.max(0, Math.floor(cropY0 + v * cropH)));
        const srcRowOff = sy * stride;
        const dstRowOff = py * (1 + pageW * 3) + 1;
        for (let px = 0; px < pageW; px++) {
          const u = px / pageW;
          const dx = (u - band.cx) / band.rx;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mask = evalGradientStops(dist, band.stops);
          if (mask <= 0.001) continue;
          const sx = Math.min(srcW - 1, Math.max(0, Math.floor(cropX0 + u * cropW)));
          const sIdx = srcRowOff + sx * 4;
          const a = (pixels[sIdx + 3] / 255) * band.opacity * mask;
          if (a <= 0.001) continue;
          const invA = 1 - a;
          const dIdx = dstRowOff + px * 3;
          rawOut[dIdx] = Math.round(pixels[sIdx] * a + rawOut[dIdx] * invA);
          rawOut[dIdx + 1] = Math.round(pixels[sIdx + 1] * a + rawOut[dIdx + 1] * invA);
          rawOut[dIdx + 2] = Math.round(pixels[sIdx + 2] * a + rawOut[dIdx + 2] * invA);
        }
      }
    }

    const ihdr = Buffer.allocUnsafe(13);
    ihdr.writeUInt32BE(pageW, 0);
    ihdr.writeUInt32BE(pageH, 4);
    ihdr[8] = 8;
    ihdr[9] = 2; // RGB
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const compressed = zlib.deflateSync(rawOut, { level: 3 });
    cachedFeatheredPagePng = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      makePngChunk('IHDR', ihdr),
      makePngChunk('IDAT', compressed),
      makePngChunk('IEND', Buffer.alloc(0)),
    ]);
    return cachedFeatheredPagePng;
  } catch (e) {
    console.error('Error building feathered PDF background:', e);
  }
  return null;
}

export function renderDocumentBackgroundPdf(doc: any) {
  const prevX = doc.x;
  const prevY = doc.y;
  doc.save();
  try {
    const featheredBg = getFeatheredPageBgPngBuffer();
    if (featheredBg) {
      const pw = doc.page?.width || 595.28;
      const ph = doc.page?.height || 841.89;
      doc.image(featheredBg, 0, 0, { width: pw, height: ph });
    }

    // Colour-accent swooshes matching the teal, sage green, and sky blue palette
    // Top-Right Teal & Sage Swooshes
    doc.save();
    doc.fillOpacity(0.055).fillColor('#0D8A99');
    doc.moveTo(250, 0)
       .bezierCurveTo(360, 75, 495, 25, 612, 155)
       .lineTo(612, 95)
       .bezierCurveTo(505, 5, 395, 45, 310, 0)
       .closePath()
       .fill();

    doc.fillOpacity(0.05).fillColor('#52B788');
    doc.moveTo(330, 0)
       .bezierCurveTo(430, 55, 530, 35, 612, 120)
       .lineTo(612, 75)
       .bezierCurveTo(540, 15, 450, 25, 385, 0)
       .closePath()
       .fill();

    doc.strokeOpacity(0.12).strokeColor('#38BDF8').lineWidth(1.4);
    doc.moveTo(220, 0)
       .bezierCurveTo(355, 92, 495, 40, 612, 175)
       .stroke();
    doc.restore();

    // Mid-Left Flowing S-Curve Swooshes
    doc.save();
    doc.fillOpacity(0.045).fillColor('#52B788');
    doc.moveTo(0, 220)
       .bezierCurveTo(95, 290, 125, 420, 0, 520)
       .lineTo(0, 470)
       .bezierCurveTo(85, 395, 65, 300, 0, 255)
       .closePath()
       .fill();

    doc.fillOpacity(0.04).fillColor('#0D8A99');
    doc.moveTo(0, 265)
       .bezierCurveTo(120, 335, 90, 455, 0, 545)
       .lineTo(0, 505)
       .bezierCurveTo(65, 435, 85, 345, 0, 295)
       .closePath()
       .fill();

    doc.strokeOpacity(0.11).strokeColor('#0D9488').lineWidth(1.2);
    doc.moveTo(0, 240)
       .bezierCurveTo(115, 315, 110, 435, 0, 535)
       .stroke();
    doc.restore();

    // Bottom-Right Wave Swooshes
    doc.save();
    doc.fillOpacity(0.055).fillColor('#0D8A99');
    doc.moveTo(190, 792)
       .bezierCurveTo(335, 685, 485, 735, 612, 575)
       .lineTo(612, 635)
       .bezierCurveTo(495, 760, 355, 720, 250, 792)
       .closePath()
       .fill();

    doc.fillOpacity(0.045).fillColor('#38BDF8');
    doc.moveTo(275, 792)
       .bezierCurveTo(400, 710, 515, 745, 612, 620)
       .lineTo(612, 665)
       .bezierCurveTo(525, 765, 420, 735, 330, 792)
       .closePath()
       .fill();

    doc.strokeOpacity(0.12).strokeColor('#52B788').lineWidth(1.4);
    doc.moveTo(165, 792)
       .bezierCurveTo(325, 670, 480, 725, 612, 555)
       .stroke();
    doc.restore();
  } catch (e) {
    // Ignore background rendering errors so document generation never fails
  }
  doc.restore();
  doc.fillOpacity(1).strokeOpacity(1).opacity(1);
  doc.x = prevX;
  doc.y = prevY;
}

function formatAuDate(dateVal: any, opts: { monthFormat?: 'short' | '2-digit' } = {}): string {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    if (opts.monthFormat === 'short') {
      const [d, m, y] = str.split('/');
      const dt = new Date(`${y}-${m}-${d}T00:00:00`);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return str;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return dt.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: opts.monthFormat === 'short' ? 'short' : '2-digit',
      year: 'numeric'
    });
  }
  return str;
}

function renderFormattedNotesPdf(doc: any, rawText: string, cardX: number, cardY: number, cardWidth: number) {
  const rawLines = rawText.split('\n');
  
  let calculatedHeight = 24;
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      calculatedHeight += 8;
      continue;
    }
    if (/^#{1,3}\s+/.test(trimmed)) {
      doc.font("Helvetica-Bold").fontSize(9.5);
      const clean = trimmed.replace(/^#{1,3}\s+/, '');
      calculatedHeight += doc.heightOfString(clean, { width: cardWidth - 36 }) + 6;
    } else if (/^[-*_]{3,}$/.test(trimmed)) {
      calculatedHeight += 12;
    } else {
      doc.font("Helvetica").fontSize(8.5);
      const clean = trimmed.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/<u>(.*?)<\/u>/gi, '$1').replace(/^>\s*/, '');
      calculatedHeight += doc.heightOfString(clean, { width: cardWidth - 36, lineGap: 3 }) + 4;
    }
  }

  const boxHeight = Math.min(Math.max(calculatedHeight + 20, 140), 620);
  doc.roundedRect(cardX, cardY, cardWidth, boxHeight, 6).fillAndStroke("#F9FAFB", "#E5E7EB");

  let textY = cardY + 16;
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      textY += 6;
      continue;
    }
    if (textY + 14 > cardY + boxHeight - 8) break;

    if (/^#{1,3}\s+/.test(trimmed)) {
      const clean = trimmed.replace(/^#{1,3}\s+/, '');
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111827");
      doc.text(clean, cardX + 18, textY, { width: cardWidth - 36 });
      textY += doc.heightOfString(clean, { width: cardWidth - 36 }) + 5;
    } else if (/^[-*_]{3,}$/.test(trimmed)) {
      textY += 4;
      doc.strokeColor("#E5E7EB").lineWidth(0.75).moveTo(cardX + 18, textY).lineTo(cardX + cardWidth - 18, textY).stroke();
      textY += 8;
    } else if (/^>\s*/.test(trimmed)) {
      const clean = trimmed.replace(/^>\s*/, '').replace(/(\*\*|__)(.*?)\1/g, '$2');
      doc.font("Helvetica-Oblique").fontSize(8);
      const quoteH = doc.heightOfString(clean, { width: cardWidth - 46 });
      doc.strokeColor("#0F766E").lineWidth(2).moveTo(cardX + 18, textY).lineTo(cardX + 18, textY + quoteH).stroke();
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#4B5563");
      doc.text(clean, cardX + 26, textY, { width: cardWidth - 46 });
      textY += quoteH + 4;
    } else {
      let isBullet = /^([•\-\*]|\[[\sx]\]|\d+\.)\s*/.test(trimmed);
      let clean = trimmed.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/<u>(.*?)<\/u>/gi, '$1');
      if (clean.startsWith('[ ] ')) {
        clean = '☐ ' + clean.slice(4);
      } else if (clean.startsWith('[x] ') || clean.startsWith('[X] ')) {
        clean = '☑ ' + clean.slice(4);
      }
      doc.font("Helvetica").fontSize(8.5).fillColor("#374151");
      const h = doc.heightOfString(clean, { width: cardWidth - 36, lineGap: 3 });
      doc.text(clean, cardX + 18, textY, { width: cardWidth - 36, lineGap: 3 });
      textY += h + (isBullet ? 3 : 4);
    }
  }
}

export function setupQuotePdfRoutes(app: any, db: any, authenticateToken: any) {
  app.get("/api/quotes/:id/download", authenticateToken, (req: any, res: any) => {
    try {
      const quoteId = req.params.id;
      const quote = db.prepare(`
        SELECT q.*, 
               c.first_name as client_first_name, c.last_name as client_last_name, c.contact_email as client_email, c.ndis_number, c.my_aged_care_id
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `).get(quoteId) as any;

      if (!quote) return res.status(404).json({ error: "Quote not found" });

      const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach((r: any) => {
        try { settingsMap[r.key] = JSON.parse(r.value); } 
        catch { settingsMap[r.key] = r.value; }
      });

      let services: any[] = [];
      if (quote.services_json) {
        try { services = JSON.parse(quote.services_json); } catch (e) {}
      }

      const tempFolder = path.join('/tmp', `quote_gen_${quoteId}_${Date.now()}`);
      fs.mkdirSync(tempFolder, { recursive: true });
      const safeFilename = quote.quote_number ? `${quote.quote_number}.pdf` : `QUOTE-${quoteId}.pdf`;
      const pdfPath = path.join(tempFolder, safeFilename);

      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
      renderDocumentBackgroundPdf(doc);

      // Letterhead / Logo (Generous prominent display matching preview)
      let logoBottomY = 40;
      if (settingsMap.letterheadLogo) {
        try {
          let buffer: Buffer | null = null;
          if (settingsMap.letterheadLogo.startsWith("/api/assets/")) {
            const fileWithQuery = settingsMap.letterheadLogo.split("/").pop();
            const filename = fileWithQuery.split("?")[0];
            const persistentAssetPath = path.join(process.cwd(), "data", "uploads", "assets", filename);
            const uploadsAssetPath = path.join(process.cwd(), "uploads", "assets", filename);
            const oldAssetPath = path.join(process.cwd(), "assets", filename);
            if (fs.existsSync(uploadsAssetPath)) buffer = fs.readFileSync(uploadsAssetPath);
            else if (fs.existsSync(persistentAssetPath)) buffer = fs.readFileSync(persistentAssetPath);
            else if (fs.existsSync(oldAssetPath)) buffer = fs.readFileSync(oldAssetPath);
          } else if (settingsMap.letterheadLogo.startsWith("data:image/")) {
            const base64Data = settingsMap.letterheadLogo.replace(/^data:image\/\w+;base64,/, "");
            buffer = Buffer.from(base64Data, "base64");
          }
          if (buffer) {
            doc.save();
            const multGs = doc.ref({ Type: "ExtGState", BM: "Multiply" });
            multGs.end();
            doc.page.ext_gstates["GsLogoMult"] = multGs;
            doc.addContent("/GsLogoMult gs");
            doc.image(buffer, 50, 25, { fit: [220, 85] });
            doc.restore();
            logoBottomY = 118;
          }
        } catch (e) {
          console.error("Error rendering logo in quote PDF:", e);
        }
      } else {
        doc.fillColor("#0D9488").roundedRect(50, 30, 32, 32, 6).fill();
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16).text("H", 50, 38, { width: 32, align: "center" });
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(15).text(settingsMap.businessName || "HAPPY IN THE HOME", 92, 38);
        logoBottomY = 75;
      }

      let provY = logoBottomY;

      // Top Right: Quote Meta
      // Service period calculation (identical to QuotePreviewModal)
      let servicePeriod = '';
      const rawStartDate = quote.activity_date || (services && services[0]?.date);
      if (rawStartDate) {
        const sDate = formatAuDate(rawStartDate, { monthFormat: 'short' });
        const firstWithEnd = (services || []).find((l: any) => l.endDate);
        if (firstWithEnd && firstWithEnd.endDate) {
          const eDateStr = formatAuDate(firstWithEnd.endDate, { monthFormat: '2-digit' });
          servicePeriod = `${sDate} – ${eDateStr}`;
        } else {
          servicePeriod = sDate;
        }
      }

      doc.fillColor("#18181B").font("Helvetica").fontSize(22).text("SERVICE QUOTE", 340, 30, { width: 240, align: "right" });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(`${quote.quote_number || ''}`, 340, 58, { width: 240, align: "right" });
      
      const qDate = quote.quote_date || quote.created_at;
      const qDateStr = formatAuDate(qDate, { monthFormat: 'short' });
      doc.font("Helvetica").fontSize(8.5).fillColor("#6B7280").text(`Date Issued: ${qDateStr}`, 340, 74, { width: 240, align: "right" });
      if (servicePeriod) {
        doc.text(`Service Period: ${servicePeriod}`, 340, 87, { width: 240, align: "right" });
      }

      const pageCountY = servicePeriod ? 100 : 87;

      // Divider below header
      let afterHeaderY = Math.max(provY, pageCountY + 14) + 8;
      doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(50, afterHeaderY).lineTo(580, afterHeaderY).stroke();
      afterHeaderY += 10;

      // Activity / Scope Banner
      if (quote.activity_name && quote.activity_name.trim()) {
        const activityText = quote.activity_name.trim();
        doc.roundedRect(50, afterHeaderY, 530, 26, 4)
           .fillAndStroke("#F0FDFA", "#99F6E4");
        
        doc.fillColor("#0F766E")
           .font("Helvetica-Bold")
           .fontSize(8)
           .text("ACTIVITY / SCOPE:", 60, afterHeaderY + 8.5);

        const activityLabelWidth = doc.widthOfString("ACTIVITY / SCOPE:") + 6;
        doc.fillColor("#111827")
           .font("Helvetica-Bold")
           .fontSize(8.5)
           .text(activityText, 60 + activityLabelWidth, afterHeaderY + 8, { width: 330 - activityLabelWidth });

        if (servicePeriod) {
          doc.fillColor("#4B5563")
             .font("Helvetica")
             .fontSize(8)
             .text(`Period: ${servicePeriod}`, 360, afterHeaderY + 8.5, { width: 210, align: "right" });
        }

        doc.fillColor("black");
        afterHeaderY += 34;
      }

      // Two-Column Service Provider & Client details
      const twoColY = afterHeaderY + 6;
      // Teal top accent lines
      doc.strokeColor("#0D9488").lineWidth(2);
      doc.moveTo(50, twoColY).lineTo(285, twoColY).stroke();
      doc.moveTo(330, twoColY).lineTo(580, twoColY).stroke();

      // Left Column: SERVICE PROVIDER
      let colLeftY = twoColY + 6;
      doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(7.5).text("SERVICE PROVIDER", 50, colLeftY);
      colLeftY += 11;
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(settingsMap.businessName || "Happy in the Home", 50, colLeftY);
      colLeftY += 14;
      doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text("NDIS & Home Care Registered Provider", 50, colLeftY);
      colLeftY += 11;
      if (settingsMap.abn) {
        doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8).text(`ABN: ${settingsMap.abn}`, 50, colLeftY);
        colLeftY += 11;
      }
      if (settingsMap.businessAddress) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(settingsMap.businessAddress, 50, colLeftY, { width: 235 });
        colLeftY += doc.heightOfString(settingsMap.businessAddress, { width: 235 }) + 2;
      }
      if (settingsMap.contactEmail) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(settingsMap.contactEmail, 50, colLeftY);
        colLeftY += 11;
      }
      if (settingsMap.contactPhone) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(`Tel: ${settingsMap.contactPhone}`, 50, colLeftY);
        colLeftY += 11;
      }

      // Right Column: PREPARED FOR
      let colRightY = twoColY + 6;
      doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(7.5).text("PREPARED FOR", 330, colRightY);
      colRightY += 11;
      const clientName = (quote.custom_client_name && quote.custom_client_name.trim())
        ? quote.custom_client_name.trim()
        : `${quote.client_first_name || ''} ${quote.client_last_name || ''}`.trim() || 'Prospective Client';
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10.5).text(clientName, 330, colRightY);
      colRightY += 14;
      doc.fillColor("#6B7280").font("Helvetica-Oblique").fontSize(8).text("Recipient / Plan Nominee", 330, colRightY);
      colRightY += 11;
      if (quote.ndis_number) {
        doc.fillColor("#374151").font("Helvetica").fontSize(8).text(`NDIS No: ${quote.ndis_number}`, 330, colRightY);
        colRightY += 11;
      } else if (quote.my_aged_care_id) {
        doc.fillColor("#374151").font("Helvetica").fontSize(8).text(`Home Care ID: ${quote.my_aged_care_id}`, 330, colRightY);
        colRightY += 11;
      }
      if (quote.client_email) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(`Email: ${quote.client_email}`, 330, colRightY);
        colRightY += 11;
      }

      let currentY = Math.max(colLeftY, colRightY) + 14;

      // Table Header Helper
      const renderTableHeader = (y: number) => {
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#18181B");
        doc.text("DATE", 50, y, { width: 75, align: "left" });
        doc.text("DESCRIPTION", 130, y, { width: 180, align: "left" });
        doc.text("TIME / HOURS", 315, y, { width: 65, align: "center" }); 
        doc.text("QTY", 385, y, { width: 35, align: "right" });
        doc.text("UNIT", 428, y, { width: 32, align: "left" });
        doc.text("RATE", 465, y, { width: 50, align: "right" });
        doc.text("AMOUNT", 520, y, { width: 60, align: "right" });

        doc.strokeColor("#18181B").lineWidth(1.5).moveTo(50, y + 13).lineTo(580, y + 13).stroke();
        return y + 19;
      };

      currentY = renderTableHeader(currentY);

      let subtotal = 0;
      let calcGst = 0;
      const hasGst = services.length > 0 && services[0].gstType === "10%";

      for (const item of services) {
        const srv = db.prepare("SELECT * FROM services WHERE id = ?").get(item.serviceId) as any;
        if (!srv) continue;

        let safeServiceName = item.serviceName || srv.name || "Unknown Service";
        doc.font("Helvetica-Bold").fontSize(8.5);
        let textHeight = doc.heightOfString(safeServiceName, { width: 180 }) || 12;

        let dateStr = formatAuDate(item.date, { monthFormat: '2-digit' });
        let endDateStr = formatAuDate(item.endDate, { monthFormat: '2-digit' });

        let qty = item.qtyOverride ? Number(item.qtyOverride) : 1;
        let finalRate = Number(srv.rate || 0);
        if (item.rateOverride !== undefined && item.rateOverride !== null && item.rateOverride !== "") {
          finalRate = Number(item.rateOverride);
        }
        let lineAmount = qty * finalRate;
        subtotal += lineAmount;

        let lineGst = 0;
        if (hasGst) {
          lineGst = Math.round((qty * finalRate) * 0.1 * 100) / 100;
        }
        calcGst += lineGst;

        let timeStr = "";
        if (item.startTime && item.endTime) {
          timeStr = `${item.startTime} - ${item.endTime}`;
          if (item.duration) timeStr += `\n(${item.duration}h)`;
        } else if (item.startTime) {
          timeStr = item.startTime;
        }

        const badgeRowHeight = (srv.code || srv.type) ? 14 : 0;
        let rowContentHeight = Math.max(textHeight + badgeRowHeight, (endDateStr && endDateStr !== dateStr) ? 22 : 14, 16);
        let blockHeight = rowContentHeight + 10;

        if (currentY + blockHeight > 660) {
          doc.addPage();
          renderDocumentBackgroundPdf(doc);
          currentY = renderTableHeader(50);
        }

        // Render Date (Line 1: Start Date, Line 2: to End Date)
        doc.fillColor("#111827").font("Helvetica").fontSize(8.5).text(dateStr || "—", 50, currentY, { width: 75, align: "left" });
        if (endDateStr && endDateStr !== dateStr) {
          doc.fillColor("#6B7280").font("Helvetica").fontSize(7.5).text(`to ${endDateStr}`, 50, currentY + 11, { width: 75, align: "left" });
        }

        // Render Description
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text(safeServiceName, 130, currentY, { width: 180, align: "left" });
        
        let badgeY = currentY + textHeight + 2;
        let badgeX = 130;
        if (srv.code) {
          const codeText = srv.code;
          doc.font("Helvetica-Bold").fontSize(7);
          const codeW = doc.widthOfString(codeText) + 10;
          doc.roundedRect(badgeX, badgeY, codeW, 11, 2).fillAndStroke("#F0FDFA", "#99F6E4");
          doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(7).text(codeText, badgeX + 5, badgeY + 2);
          badgeX += codeW + 4;
        }
        if (srv.type) {
          const typeText = srv.type === 'HOME_CARE' ? 'Home Care' : 'NDIS';
          doc.font("Helvetica-Bold").fontSize(7);
          const typeW = doc.widthOfString(typeText) + 8;
          doc.roundedRect(badgeX, badgeY, typeW, 11, 2).fillAndStroke("#F3F4F6", "#E5E7EB");
          doc.fillColor("#4B5563").font("Helvetica-Bold").fontSize(7).text(typeText, badgeX + 4, badgeY + 2);
        }

        // Render Time / Hours (Single line centered)
        if (timeStr) {
          doc.fillColor("#4B5563").font("Helvetica").fontSize(8).text(timeStr, 315, currentY, { width: 65, align: "center" });
        } else {
          doc.fillColor("#9CA3AF").font("Helvetica").fontSize(8).text("—", 315, currentY, { width: 65, align: "center" });
        }

        // Render Qty
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text(qty.toString(), 385, currentY, { width: 35, align: "right" });

        // Render Unit
        const unitDisplay = item.unit || srv.unit || "Hr";
        doc.fillColor("#6B7280").font("Helvetica").fontSize(8).text(unitDisplay, 428, currentY, { width: 32, align: "left" });

        // Render Rate
        doc.fillColor("#374151").font("Helvetica").fontSize(8.5).text(`$${finalRate.toFixed(2)}`, 465, currentY, { width: 50, align: "right" });

        // Render Amount
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text(`$${lineAmount.toFixed(2)}`, 520, currentY, { width: 60, align: "right" });

        let rowBottomY = currentY + rowContentHeight + 5;
        doc.strokeColor("#E5E7EB").lineWidth(0.5).moveTo(50, rowBottomY).lineTo(580, rowBottomY).stroke();
        currentY = rowBottomY + 6;
      }

      let totalAmount = subtotal + calcGst;

      let totalsY = currentY + 16;
      if (totalsY + 105 > 730) {
        doc.addPage();
        renderDocumentBackgroundPdf(doc);
        totalsY = 55;
      }

      // Divider line above totals section (matching preview border-t-2 border-zinc-900)
      doc.strokeColor("#18181B").lineWidth(1.5).moveTo(50, totalsY - 6).lineTo(580, totalsY - 6).stroke();

      // Right Card: Financial Summary (Subtotal, GST, TOTAL AMOUNT)
      doc.roundedRect(340, totalsY, 240, 95, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
      
      doc.fillColor("#4B5563").font("Helvetica").fontSize(8.5).text("Subtotal:", 355, totalsY + 14);
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${subtotal.toFixed(2)}`, 455, totalsY + 14, { width: 110, align: "right" });

      const gstLabel = hasGst ? "GST (10%):" : "GST (GST Free):";
      doc.fillColor("#4B5563").font("Helvetica").text(gstLabel, 355, totalsY + 30);
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${calcGst.toFixed(2)}`, 455, totalsY + 30, { width: 110, align: "right" });

      doc.strokeColor("#D1D5DB").lineWidth(0.75).moveTo(355, totalsY + 48).lineTo(565, totalsY + 48).stroke();

      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5).text("TOTAL AMOUNT:", 355, totalsY + 58);
      doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(13.5).text(`$${totalAmount.toFixed(2)}`, 445, totalsY + 56, { width: 120, align: "right" });
      doc.fillColor("#6B7280").font("Helvetica").fontSize(7).text("AUD • Inclusive of applicable GST", 355, totalsY + 76, { width: 210, align: "right" });

      // Move "Important Notes & Terms of Service" to its own completely separate page at the very end
      doc.addPage();
      renderDocumentBackgroundPdf(doc);

      // Important Notes & Terms of Service Page
      // Top section title banner
      doc.roundedRect(50, 60, 530, 26, 4).fillAndStroke("#F0FDFA", "#CCFBF1");
      doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(9.5).text("IMPORTANT NOTES & TERMS OF SERVICE", 64, 69);

      const defaultNotes = [
        "• This quote is valid for 30 calendar days from the date of issue.",
        "• Pricing adheres strictly to current NDIA Price Limits and Home Care guidelines.",
        "• Payment terms: 14 days from date of tax invoice upon service delivery.",
        "• Cancellations require 24 hours advance notice per standard service agreements."
      ].join("\n\n");

      const notesText = (quote.important_notes && quote.important_notes.trim())
        ? quote.important_notes.trim()
        : defaultNotes;

      renderFormattedNotesPdf(doc, notesText, 50, 96, 530);

      // Document Page Numbering & Footer
      // Set bottom margin to 0 on every switched page so footer text never triggers accidental auto-page-breaks
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const pageNum = i + 1;

        // Render page count in header on page 1:
        if (i === 0) {
          doc.font("Helvetica").fontSize(8.5).fillColor("#6B7280").text(
            `Page: Page ${pageNum} of ${totalPages}`,
            340,
            pageCountY,
            { width: 240, align: "right", lineBreak: false }
          );
        } else {
          // Page 2+ running header
          doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827").text(
            `SERVICE QUOTE — ${quote.quote_number || ''}`,
            50,
            28,
            { width: 300, align: "left", lineBreak: false }
          );
          doc.font("Helvetica").fontSize(8.5).fillColor("#6B7280").text(
            `Page ${pageNum} of ${totalPages}`,
            340,
            28,
            { width: 240, align: "right", lineBreak: false }
          );
          doc.strokeColor("#E5E7EB").lineWidth(0.5).moveTo(50, 42).lineTo(580, 42).stroke();
        }

        // Clean footer at the bottom of every page (inside 792 page height)
        const footerY = 746;
        doc.strokeColor("#E5E7EB").lineWidth(0.5).moveTo(50, footerY).lineTo(580, footerY).stroke();
        doc.font("Helvetica").fontSize(7.5).fillColor("#9CA3AF");
        doc.text(
          `${settingsMap.businessName || 'Happy in the Home'} • Generated via Care Management System`,
          50,
          footerY + 6,
          { width: 350, align: "left", lineBreak: false }
        );
        doc.text(
          `Ref: ${quote.quote_number || ''}`,
          400,
          footerY + 6,
          { width: 180, align: "right", lineBreak: false }
        );

        doc.page.margins.bottom = oldBottom;
      }

      writeStream.on('finish', () => {
        res.download(pdfPath, safeFilename, (err: any) => {
          if (err) {
            console.error("Error downloading quote PDF:", err);
          }
          setTimeout(() => {
            fs.unlink(pdfPath, () => {});
            fs.rmdir(tempFolder, () => {});
          }, 5000);
        });
      });
      
      doc.end();

    } catch (e) {
      console.error("Quote PDF Error:", e);
      res.status(500).json({ error: "Failed to generate Quote PDF" });
    }
  });

  app.get("/api/quotes/:id/preview", authenticateToken, (req: any, res: any) => {
    try {
      const quoteId = req.params.id;
      const quote = db.prepare(`
        SELECT q.*, 
               c.first_name as client_first_name, c.last_name as client_last_name, c.contact_email as client_email, c.ndis_number, c.my_aged_care_id
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `).get(quoteId) as any;

      if (!quote) return res.status(404).json({ error: "Quote not found" });

      const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
      const settingsMap: Record<string, any> = {};
      settingsRows.forEach((r: any) => {
        try { settingsMap[r.key] = JSON.parse(r.value); } 
        catch { settingsMap[r.key] = r.value; }
      });

      let services: any[] = [];
      if (quote.services_json) {
        try { services = JSON.parse(quote.services_json); } catch (e) {}
      }

      let subtotal = 0;
      let calcGst = 0;
      const hasGst = services.length > 0 && services[0].gstType === "10%";

      let lineItems = services.map((item: any) => {
        const srv = db.prepare("SELECT * FROM services WHERE id = ?").get(item.serviceId) as any;
        if (!srv) return null;

        let qty = item.qtyOverride ? Number(item.qtyOverride) : 1;
        let finalRate = Number(srv.rate || 0);
        if (item.rateOverride !== undefined && item.rateOverride !== null && item.rateOverride !== "") {
          finalRate = Number(item.rateOverride);
        }
        let lineAmount = qty * finalRate;
        subtotal += lineAmount;

        let lineGst = 0;
        if (hasGst) {
          lineGst = Math.round((qty * finalRate) * 0.1 * 100) / 100;
        }
        calcGst += lineGst;

        let timeStr = "";
        if (item.startTime && item.endTime) {
          timeStr = `${item.startTime} - ${item.endTime}`;
          if (item.duration) {
             timeStr += `\n(${item.duration}h)`;
          }
        } else if (item.startTime) {
          timeStr = item.startTime;
        }

        let dateStr = formatAuDate(item.date, { monthFormat: '2-digit' });
        let endDateStr = formatAuDate(item.endDate, { monthFormat: '2-digit' });

        return {
          date: dateStr,
          endDate: endDateStr,
          serviceName: item.serviceName || srv.name || "Unknown Service",
          code: srv.code || "N/A",
          type: srv.type || "",
          time: timeStr,
          qty,
          unit: item.unit || srv.unit || "Hr",
          rate: finalRate,
          gst: lineGst,
          amount: lineAmount
        };
      }).filter(Boolean);

      let gstAmount = calcGst;
      let totalAmount = subtotal + gstAmount;

      res.json({
        success: true,
        data: {
          quote,
          settingsMap,
          lineItems,
          subtotal,
          totalAmount,
          gstAmount
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
