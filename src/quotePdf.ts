import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

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
            doc.image(buffer, 50, 25, { fit: [220, 85] });
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

      // Contact details under logo (left side)
      let provY = logoBottomY + 4;
      doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8);
      if (settingsMap.abn) {
        doc.text(`ABN: ${settingsMap.abn}`, 50, provY);
        provY += 11;
      }
      doc.fillColor("#6B7280").font("Helvetica").fontSize(8);
      if (settingsMap.businessAddress) {
        doc.text(settingsMap.businessAddress, 50, provY, { width: 230 });
        provY += doc.heightOfString(settingsMap.businessAddress, { width: 230 }) + 1;
      }
      if (settingsMap.contactEmail) {
        doc.text(settingsMap.contactEmail, 50, provY);
        provY += 11;
      }
      if (settingsMap.contactPhone) {
        doc.text(`Tel: ${settingsMap.contactPhone}`, 50, provY);
        provY += 11;
      }

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
      if (totalsY + 125 > 740) {
        doc.addPage();
        totalsY = 50;
      }

      // Divider line above notes & totals section (matching preview border-t-2 border-zinc-900)
      doc.strokeColor("#18181B").lineWidth(1.5).moveTo(50, totalsY - 6).lineTo(580, totalsY - 6).stroke();

      // Left Card: Important Notes (Dynamic positioning to prevent overlapping lines)
      doc.roundedRect(50, totalsY, 290, 105, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8).text("IMPORTANT NOTES & TERMS OF SERVICE", 64, totalsY + 10);
      doc.fillColor("#4B5563").font("Helvetica").fontSize(7.5);
      
      let noteY = totalsY + 23;
      if (quote.important_notes && quote.important_notes.trim()) {
        doc.text(quote.important_notes.trim(), 64, noteY, { width: 262, height: 75 });
      } else {
        const defaultNotes = [
          "• This quote is valid for 30 calendar days from the date of issue.",
          "• Pricing adheres strictly to current NDIA Price Limits and Home Care guidelines.",
          "• Payment terms: 14 days from date of tax invoice upon service delivery.",
          "• Cancellations require 24 hours advance notice per standard service agreements."
        ];
        for (const note of defaultNotes) {
          doc.text(note, 64, noteY, { width: 262 });
          const textH = doc.heightOfString(note, { width: 262 });
          noteY += textH + 3;
        }
      }

      // Right Card: Financial Summary
      doc.roundedRect(355, totalsY, 225, 105, 6).fillAndStroke("#F9FAFB", "#E5E7EB");
      
      doc.fillColor("#4B5563").font("Helvetica").fontSize(8.5).text("Subtotal:", 370, totalsY + 14);
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${subtotal.toFixed(2)}`, 460, totalsY + 14, { width: 105, align: "right" });

      const gstLabel = hasGst ? "GST (10%):" : "GST (GST Free):";
      doc.fillColor("#4B5563").font("Helvetica").text(gstLabel, 370, totalsY + 30);
      doc.fillColor("#111827").font("Helvetica-Bold").text(`$${calcGst.toFixed(2)}`, 460, totalsY + 30, { width: 105, align: "right" });

      doc.strokeColor("#D1D5DB").lineWidth(0.75).moveTo(370, totalsY + 48).lineTo(565, totalsY + 48).stroke();

      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9.5).text("TOTAL AMOUNT:", 370, totalsY + 58);
      doc.fillColor("#0F766E").font("Helvetica-Bold").fontSize(14).text(`$${totalAmount.toFixed(2)}`, 450, totalsY + 56, { width: 115, align: "right" });
      doc.fillColor("#6B7280").font("Helvetica").fontSize(7).text("AUD • Inclusive of applicable GST", 370, totalsY + 76, { width: 195, align: "right" });

      // Document Page Numbering & Footer
      // Temporarily set bottom margin to 0 so footer text never triggers accidental auto-page-breaks
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
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
      }

      doc.page.margins.bottom = oldBottom;

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
