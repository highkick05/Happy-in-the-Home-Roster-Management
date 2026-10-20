import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

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

      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Letterhead
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
            doc.image(buffer, 50, 20, { fit: [200, 80] });
            doc.y = 35;
          } else {
            doc.moveDown();
          }
        } catch (e) {
          doc.moveDown();
        }
      } else {
        doc.moveDown();
        if (settingsMap.businessName) doc.fontSize(14).text(settingsMap.businessName);
        if (settingsMap.abn) doc.fontSize(10).text(`ABN: ${settingsMap.abn}`);
        if (settingsMap.businessAddress) doc.text(settingsMap.businessAddress);
        doc.moveDown();
      }

      doc.fillColor("black");
      doc.fontSize(20).font("Helvetica-Bold").text("SERVICE QUOTE", 350, 40, { width: 230, align: "right" });
      doc.fontSize(10).font("Helvetica-Bold").text(`Quote No: ${quote.quote_number || ''}`, 350, 65, { width: 230, align: "right" });
      
      const qDate = quote.quote_date || quote.created_at;
      const qDateStr = qDate ? new Date(qDate).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      doc.font("Helvetica").fontSize(9).text(`Date Issued: ${qDateStr}`, 350, 79, { width: 230, align: "right" });
      if (quote.activity_date) {
        const aDateStr = new Date(quote.activity_date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.text(`Service Period: ${aDateStr}`, 350, 92, { width: 230, align: "right" });
      }

      const topY = 120;
      doc.fontSize(10).font("Helvetica-Bold").text("FROM", 50, topY);
      doc.fontSize(11).font("Helvetica-Bold").text(settingsMap.businessName || "Happy in the Home", 50, topY + 14);
      doc.fontSize(9).font("Helvetica");
      let fromY = topY + 28;
      if (settingsMap.abn) { doc.text(`ABN: ${settingsMap.abn}`, 50, fromY); fromY += 13; }
      if (settingsMap.businessAddress) { doc.text(settingsMap.businessAddress, 50, fromY, { width: 240 }); fromY += 13; }
      if (settingsMap.contactEmail) { doc.text(settingsMap.contactEmail, 50, fromY); fromY += 13; }
      if (settingsMap.contactPhone) { doc.text(`Tel: ${settingsMap.contactPhone}`, 50, fromY); fromY += 13; }

      doc.fontSize(10).font("Helvetica-Bold").text("PREPARED FOR", 320, topY);
      const clientName = (quote.custom_client_name && quote.custom_client_name.trim())
        ? quote.custom_client_name.trim()
        : `${quote.client_first_name || ''} ${quote.client_last_name || ''}`.trim() || 'Prospective Client';
      doc.fontSize(11).font("Helvetica-Bold").text(clientName, 320, topY + 14);
      doc.fontSize(9).font("Helvetica");
      let prepY = topY + 28;
      if (quote.ndis_number) {
        doc.text(`NDIS No: ${quote.ndis_number}`, 320, prepY);
        prepY += 13;
      } else if (quote.my_aged_care_id) {
        doc.text(`Home Care ID: ${quote.my_aged_care_id}`, 320, prepY);
        prepY += 13;
      }
      if (quote.client_email) {
        doc.text(`Email: ${quote.client_email}`, 320, prepY);
        prepY += 13;
      }

      let afterCardsY = Math.max(fromY, prepY) + 10;

      // Prominently render Activity Name / Scope
      if (quote.activity_name && quote.activity_name.trim()) {
        const activityText = quote.activity_name.trim();
        doc.roundedRect(50, afterCardsY, 530, 24, 3)
           .fillAndStroke("#F4FBF9", "#B2DFDB");
        
        doc.fillColor("#004D40")
           .font("Helvetica-Bold")
           .fontSize(9)
           .text("ACTIVITY / SCOPE:", 60, afterCardsY + 7);

        const activityLabelWidth = doc.widthOfString("ACTIVITY / SCOPE:") + 10;
        doc.fillColor("#111827")
           .font("Helvetica-Bold")
           .fontSize(9.5)
           .text(activityText, 60 + activityLabelWidth, afterCardsY + 6.5, { width: 500 - activityLabelWidth });

        if (quote.activity_date) {
          const actDateStr = new Date(quote.activity_date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
          doc.fillColor("#4B5563")
             .font("Helvetica")
             .fontSize(8.5)
             .text(`Date: ${actDateStr}`, 460, afterCardsY + 7, { width: 110, align: "right" });
        }

        doc.fillColor("black");
        afterCardsY += 34;
      }

      let currentY = afterCardsY;

      // Table Header
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("DATE", 50, currentY, { width: 60, align: "left" });
      doc.text("DESCRIPTION", 115, currentY, { width: 135, align: "left" });
      doc.text("TIME", 255, currentY, { width: 70, align: "left" }); 
      doc.text("QTY", 330, currentY, { width: 25, align: "right" });
      doc.text("UNIT", 360, currentY, { width: 35, align: "left" });
      doc.text("RATE", 400, currentY, { width: 45, align: "right" });
      doc.text("GST", 450, currentY, { width: 45, align: "right" });
      doc.text("AMOUNT", 500, currentY, { width: 65, align: "right" });

      doc.moveTo(50, currentY + 15).lineTo(580, currentY + 15).stroke();
      currentY += 22;

      doc.font("Helvetica").fontSize(10);
      let subtotal = 0;
      let calcGst = 0;
      const hasGst = services.length > 0 && services[0].gstType === "10%";

      for (const item of services) {
        const srv = db.prepare("SELECT * FROM services WHERE id = ?").get(item.serviceId) as any;
        if (!srv) continue;

        let safeServiceName = item.serviceName || srv.name || "Unknown Service";
        let textHeight = doc.heightOfString(safeServiceName, { width: 135 }) || 15;

        let dateStr = "";
        if (item.date) {
           const d = new Date(item.date);
           if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
           } else {
              dateStr = item.date;
           }
        }
        let endDateStr = "";
        if (item.endDate) {
           const ed = new Date(item.endDate);
           if (!isNaN(ed.getTime())) {
              endDateStr = ed.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
           } else {
              endDateStr = item.endDate;
           }
        }
        let displayDate = dateStr;
        if (dateStr && endDateStr) {
           displayDate = `${dateStr} -\n${endDateStr}`;
        } else if (!dateStr && endDateStr) {
           displayDate = endDateStr;
        }

        let dateHeight = doc.heightOfString(displayDate, { width: 60 }) || 15;
        let blockHeight = Math.max(textHeight, dateHeight) + 20;

        if (currentY + blockHeight > 700) {
          doc.addPage();
          doc.font("Helvetica-Bold").fontSize(10);
          doc.text("DATE", 50, 50, { width: 60, align: "left" });
          doc.text("DESCRIPTION", 115, 50, { width: 135, align: "left" });
          doc.text("TIME", 255, 50, { width: 70, align: "left" });
          doc.text("QTY", 330, 50, { width: 25, align: "right" });
          doc.text("UNIT", 360, 50, { width: 35, align: "left" });
          doc.text("RATE", 400, 50, { width: 45, align: "right" });
          doc.text("GST", 450, 50, { width: 45, align: "right" });
          doc.text("AMOUNT", 500, 50, { width: 65, align: "right" });
          doc.moveTo(50, 65).lineTo(580, 65).stroke();
          currentY = 75;
        }

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

        doc.font("Helvetica").fontSize(10);
        doc.text(displayDate, 50, currentY, { width: 60, align: "left" });
        doc.fontSize(9).text(timeStr, 255, currentY, { width: 70, align: "left" });
        doc.fontSize(10);
        
        doc.text(safeServiceName, 115, currentY, { width: 135, align: "left" });
        let descY = currentY + textHeight + 2;
        
        doc.fontSize(9).text(`Code: ${srv.code || "N/A"}`, 115, descY, { width: 135, align: "left" });
        doc.fontSize(10);
        
        doc.text(qty.toString(), 330, currentY, { width: 25, align: "right" });
        doc.text(srv.unit || "N/A", 360, currentY, { width: 35, align: "left" });
        doc.text(`$${finalRate.toFixed(2)}`, 400, currentY, { width: 45, align: "right" });
        doc.text(`$${lineGst.toFixed(2)}`, 450, currentY, { width: 45, align: "right" });
        doc.text(`$${lineAmount.toFixed(2)}`, 500, currentY, { width: 65, align: "right" });

        let rowBottomY = Math.max(descY + 14, currentY + dateHeight);
        doc.moveTo(50, rowBottomY + 15).lineTo(580, rowBottomY + 15).stroke();
        currentY = rowBottomY + 22;
      }

      let totalAmount = subtotal + calcGst;

      let totalsY = currentY + 30;
      if (totalsY + 100 > 700) {
        doc.addPage();
        totalsY = 50;
      }
      
      doc.font("Helvetica");
      doc.text("Subtotal:", 350, totalsY, { width: 100, align: "right" });
      doc.text(`$${subtotal.toFixed(2)}`, 480, totalsY, { width: 70, align: "right" });
      
      if (calcGst > 0) {
        doc.text("GST (10%):", 350, totalsY + 15, { width: 100, align: "right" });
        doc.text(`$${calcGst.toFixed(2)}`, 480, totalsY + 15, { width: 70, align: "right" });
      } else {
        doc.text("GST (GST-Free):", 350, totalsY + 15, { width: 100, align: "right" });
        doc.text("$0.00", 480, totalsY + 15, { width: 70, align: "right" });
      }
      
      doc.moveTo(380, totalsY + 30).lineTo(550, totalsY + 30).stroke();
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("TOTAL AMOUNT:", 350, totalsY + 40, { width: 130, align: "right" });
      doc.text(`$${totalAmount.toFixed(2)}`, 480, totalsY + 40, { width: 70, align: "right" });
      
      if (quote.important_notes) {
        doc.moveDown(4);
        doc.font("Helvetica").fontSize(10);
        doc.text("Notes:", 50, doc.y);
        doc.text(quote.important_notes, 50, doc.y + 15, { width: 500, align: "left" });
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

        let dateStr = "";
        if (item.date) {
           const d = new Date(item.date);
           if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
           } else {
              dateStr = item.date;
           }
        }
        let endDateStr = "";
        if (item.endDate) {
           const ed = new Date(item.endDate);
           if (!isNaN(ed.getTime())) {
              endDateStr = ed.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
           } else {
              endDateStr = item.endDate;
           }
        }

        return {
          date: dateStr,
          endDate: endDateStr,
          serviceName: item.serviceName || srv.name || "Unknown Service",
          code: srv.code || "N/A",
          type: srv.type || "",
          time: timeStr,
          qty,
          unit: srv.unit || "Hr",
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
