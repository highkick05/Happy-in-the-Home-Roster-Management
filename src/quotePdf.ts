import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export function setupQuotePdfRoutes(app: any, db: any, authenticateToken: any) {
  app.get("/api/quotes/:id/download", authenticateToken, (req: any, res: any) => {
    try {
      const quoteId = req.params.id;
      const quote = db.prepare(`
        SELECT q.*, 
               c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email, c.ndis_number, c.my_aged_care_id
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
      doc.fontSize(20).font("Helvetica-Bold").text("SERVICE QUOTE", { align: "right" });
      doc.fontSize(10).font("Helvetica").text(`Quote No: ${quote.quote_number || ''}`, { align: "right" });
      
      const qDate = quote.quote_date || quote.created_at;
      doc.text(`Date: ${qDate ? new Date(qDate).toLocaleDateString() : ''}`, { align: "right" });
      doc.moveDown();

      const topY = 115;
      doc.fontSize(10).font("Helvetica-Bold").text("FROM", 50, topY);
      doc.fontSize(12).font("Helvetica-Bold").text(settingsMap.businessName || "", 50, topY + 15);
      doc.fontSize(10).font("Helvetica");
      let cy = topY + 30;
      if (settingsMap.abn) { doc.text(`ABN: ${settingsMap.abn}`, 50, cy); cy += 15; }
      if (settingsMap.businessAddress) { doc.text(settingsMap.businessAddress, 50, cy); cy += 15; }
      if (settingsMap.contactEmail) { doc.text(settingsMap.contactEmail, 50, cy); }

      doc.fontSize(10).font("Helvetica-Bold").text("PREPARED FOR", 300, topY);
      const clientName = `${quote.client_first_name || ''} ${quote.client_last_name || ''}`.trim();
      doc.fontSize(12).text(clientName, 300, topY + 15);
      
      const ndisVal = quote.ndis_number || quote.my_aged_care_id || "N/A";
      doc.fontSize(10).font("Helvetica").text(`ID No: ${ndisVal}`, 300, topY + 30);
      doc.moveDown(4);

      let currentY = Math.max(doc.y + 10, 295);

      // Table Header
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("DATE", 50, currentY, { width: 60, align: "left" });
      doc.text("DESCRIPTION", 110, currentY, { width: 150, align: "left" });
      doc.text("TIME", 265, currentY, { width: 100, align: "left" }); // THIS IS WHAT THE USER WANTS
      doc.text("QTY", 370, currentY, { width: 35, align: "right" });
      doc.text("UNIT", 410, currentY, { width: 45, align: "left" });
      doc.text("RATE", 460, currentY, { width: 50, align: "right" });
      doc.text("AMOUNT", 515, currentY, { width: 65, align: "right" });
      doc.moveTo(50, currentY + 15).lineTo(580, currentY + 15).stroke();
      currentY += 20;

      doc.font("Helvetica").fontSize(10);
      let subtotal = 0;
      let calcGst = 0;

      for (const item of services) {
        const srv = db.prepare("SELECT * FROM services WHERE id = ?").get(item.serviceId) as any;
        if (!srv) continue;

        let safeServiceName = srv.name || "Unknown Service";
        let textHeight = doc.heightOfString(safeServiceName, { width: 150 }) || 15;
        let blockHeight = textHeight + 20;

        if (currentY + blockHeight > 700) {
          doc.addPage();
          doc.font("Helvetica-Bold").fontSize(10);
          doc.text("DATE", 50, 50, { width: 60, align: "left" });
          doc.text("DESCRIPTION", 110, 50, { width: 150, align: "left" });
          doc.text("TIME", 265, 50, { width: 100, align: "left" });
          doc.text("QTY", 370, 50, { width: 35, align: "right" });
          doc.text("UNIT", 410, 50, { width: 45, align: "left" });
          doc.text("RATE", 460, 50, { width: 50, align: "right" });
          doc.text("AMOUNT", 515, 50, { width: 65, align: "right" });
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

        let timeStr = "";
        if (item.startTime && item.endTime) {
          timeStr = `${item.startTime} - ${item.endTime}`;
          if (item.duration) {
             timeStr += ` (${item.duration}h)`;
          }
        } else if (item.startTime) {
          timeStr = item.startTime;
        }

        doc.font("Helvetica").fontSize(10);
        doc.text(item.date || "", 50, currentY, { width: 60, align: "left" });
        doc.fontSize(9).text(timeStr, 265, currentY, { width: 100, align: "left" });
        doc.fontSize(10);
        
        doc.text(safeServiceName, 110, currentY, { width: 150, align: "left" });
        let descY = currentY + textHeight + 2;
        
        doc.fontSize(9).text(`Code: ${srv.item_number || "N/A"}`, 110, descY, { width: 150, align: "left" });
        doc.fontSize(10);
        
        doc.text(qty.toString(), 370, currentY, { width: 35, align: "right" });
        doc.text(srv.unit || "N/A", 410, currentY, { width: 45, align: "left" });
        doc.text(`$${finalRate.toFixed(2)}`, 460, currentY, { width: 50, align: "right" });
        doc.text(`$${lineAmount.toFixed(2)}`, 515, currentY, { width: 65, align: "right" });

        doc.moveTo(50, descY + 15).lineTo(580, descY + 15).stroke();
        currentY = descY + 20;
      }

      // If GST applies to Quote
      if (services.length > 0 && services[0].gstType === "10%") {
        calcGst = Math.round(subtotal * 0.1 * 100) / 100;
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
}
