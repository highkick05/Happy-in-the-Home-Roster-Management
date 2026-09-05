import fs from 'fs';
import path from 'path';

const buildRemittancePdf = (doc: any, data: any) => {
    const { shift, settingsMap, invoiceNum, invoiceDate, lineItems, subtotal } =
      data;
    const isHomeCare =
      shift.funding_type === "HCP" ||
      shift.funding_type === "Home Care" ||
      shift.funding_type === "HOME_CARE";
    const gstAmount =
      data.gstAmount !== undefined
        ? data.gstAmount
        : isHomeCare
          ? lineItems.reduce((acc: number, curr: any) => acc + (Math.round((curr.amount || 0) * 0.1 * 100) / 100), 0)
          : 0;
    const totalAmount =
      data.totalAmount !== undefined ? data.totalAmount : subtotal + gstAmount;

    if (settingsMap.letterheadLogo) {
      try {
        let buffer: Buffer | null = null;

        if (settingsMap.letterheadLogo.startsWith("/api/assets/")) {
          const fileWithQuery = settingsMap.letterheadLogo.split("/").pop();
          const filename = fileWithQuery.split("?")[0]; // Strip the query params
          const persistentAssetPath = path.join(process.cwd(), "data", "uploads", "assets", filename);
          const uploadsAssetPath = path.join(process.cwd(), "uploads", "assets", filename);
          const oldAssetPath = path.join(process.cwd(), "assets", filename);
          if (fs.existsSync(uploadsAssetPath)) {
            buffer = fs.readFileSync(uploadsAssetPath);
          } else if (fs.existsSync(persistentAssetPath)) {
            buffer = fs.readFileSync(persistentAssetPath);
          } else if (fs.existsSync(oldAssetPath)) {
            buffer = fs.readFileSync(oldAssetPath);
          }
        } else if (settingsMap.letterheadLogo.startsWith("data:image/")) {
          const base64Data = settingsMap.letterheadLogo.replace(
            /^data:image\/\w+;base64,/,
            "",
          );
          buffer = Buffer.from(base64Data, "base64");
        }

        if (buffer) {
          doc.image(buffer, 50, 20, { fit: [200, 80] });
          doc.y = 35;
        } else {
          doc.moveDown();
        }
      } catch (e) {
        console.error("Error drawing letterhead:", e);
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
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("REMITTANCE ADVICE", { align: "right" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice No: ${invoiceNum}`, { align: "right" });
    doc.text(`Date: ${invoiceDate}`, { align: "right" });
    doc.moveDown();

    const topY = 115;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("FROM", 50, topY);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(settingsMap.businessName || "", 50, topY + 15);
    doc.fontSize(10).font("Helvetica");
    let cy = topY + 30;
    if (settingsMap.abn) {
      doc.text(`ABN: ${settingsMap.abn}`, 50, cy);
      cy += 15;
    }
    if (settingsMap.businessAddress) {
      doc.text(settingsMap.businessAddress, 50, cy);
      cy += 15;
    }
    if (settingsMap.contactEmail) {
      doc.text(settingsMap.contactEmail, 50, cy);
    }

    const billToLabel = isHomeCare ? "PROVIDER" : "PLAN MANAGER";
    let billToName = shift.plan_manager_name || `${shift.c_fn} ${shift.c_ln}`;
    let billToEmail = shift.plan_manager_email || "";
    let billToAddress = shift.plan_manager_address || "";

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("BILL TO", 300, topY);
    doc.fontSize(12).text(`${shift.c_fn} ${shift.c_ln}`, 300, topY + 15);
    const ndisLabel = isHomeCare ? "Home Care ID:" : "NDIS No:";
    const ndisVal = shift.my_aged_care_id || shift.ndis_number;
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${ndisLabel} ${ndisVal || "N/A"}`, 300, topY + 30);

    doc.moveDown(1);
    const pmY = doc.y;
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(billToLabel, 300, pmY)
      .fillColor("black");
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(billToName, 300, pmY + 10);
    if (billToEmail) doc.text(billToEmail, 300, pmY + 22);
    if (billToAddress) doc.text(billToAddress, 300, pmY + 34);

    doc.moveDown(4);

    let currentY = Math.max(doc.y + 10, 295);

    // Table Header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("DATE", 50, currentY, { width: 60, align: "left" });
    doc.text("DESCRIPTION", 110, currentY, { width: 150, align: "left" });
    doc.text("TIME", 265, currentY, { width: 100, align: "left" });
    doc.text("QTY", 370, currentY, { width: 35, align: "right" });
    doc.text("UNIT", 410, currentY, { width: 55, align: "left" });
    doc.text("RATE", 470, currentY, { width: 50, align: "right" });
    doc.text("AMOUNT", 525, currentY, { width: 55, align: "right" });

    doc
      .moveTo(50, currentY + 15)
      .lineTo(580, currentY + 15)
      .stroke();

    currentY += 20;
    doc.font("Helvetica").fontSize(10);

    lineItems.forEach((item: any) => {
      let safeServiceName = item.serviceName || "Unknown Service";
      let textHeight =
        doc.heightOfString(safeServiceName, { width: 150 }) || 15;
      let blockHeight = textHeight + 20 + (item.metadata ? 12 : 0);

      // Automatically add page if the required height for this line item exceeds the margin
      if (currentY + blockHeight > 700) {
        doc.addPage();
        // Print Header again for the new page
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("DATE", 50, 50, { width: 60, align: "left" });
        doc.text("DESCRIPTION", 110, 50, { width: 150, align: "left" });
        doc.text("TIME", 265, 50, { width: 100, align: "left" });
        doc.text("QTY", 370, 50, { width: 35, align: "right" });
        doc.text("UNIT", 410, 50, { width: 55, align: "left" });
        doc.text("RATE", 470, 50, { width: 50, align: "right" });
        doc.text("AMOUNT", 525, 50, { width: 55, align: "right" });
        doc.moveTo(50, 65).lineTo(580, 65).stroke();
        currentY = 75;
      }

      doc.font("Helvetica").fontSize(10);
      doc.text(item.date, 50, currentY, { width: 60, align: "left" });

      doc
        .fontSize(9)
        .text(item.time, 265, currentY, { width: 100, align: "left" });
      doc.fontSize(10);

      // Calculate dynamic height for description block
      doc.text(safeServiceName, 110, currentY, { width: 150, align: "left" });

      let descY = currentY + textHeight + 2;
      const codePrefix =
        shift.funding_type === "HCP" ||
        shift.funding_type === "Home Care" ||
        shift.funding_type === "HOME_CARE"
          ? "Serv. ID:"
          : "Code:";
      doc.fontSize(9).text(`${codePrefix} ${item.code || "N/A"}`, 110, descY, {
        width: 150,
        align: "left",
      });

      if (item.metadata) {
        descY += 12;
        doc.text(item.metadata, 110, descY, { width: 150, align: "left" });
      }

      doc.fontSize(10);
      doc.text(item.qty.toString(), 370, currentY, {
        width: 35,
        align: "right",
      });
      doc.text(item.unit, 410, currentY, { width: 55, align: "left" });
      doc.text(`$${item.rate.toFixed(2)}`, 470, currentY, {
        width: 50,
        align: "right",
      });
      doc.text(`$${item.amount.toFixed(2)}`, 525, currentY, {
        width: 55,
        align: "right",
      });

      // Dynamic Row Height: increment currentY by that height plus a 5pt buffer
      doc
        .moveTo(50, descY + 15)
        .lineTo(580, descY + 15)
        .stroke();
      currentY = descY + 20;
    });

    let totalsY = currentY + 30;

    if (totalsY + 100 > 700) {
      doc.addPage();
      totalsY = 50;
    }

    let bankName = "National Australia Bank";
    let bankAccName = "Happy in the Home";
    let bankBsb = "086-554";
    let bankAcc = "506627847";
    try {
      if (settingsMap.bankName) bankName = settingsMap.bankName;
      if (settingsMap.bankAccountName)
        bankAccName = settingsMap.bankAccountName;
      if (settingsMap.bankBsb) bankBsb = settingsMap.bankBsb;
      if (settingsMap.bankAcc) bankAcc = settingsMap.bankAcc;
    } catch (e) {
      if (
        e.message &&
        !e.message.includes("duplicate column") &&
        !e.message.includes("no such column")
      )
        console.warn("Migration/Query warning:", e.message);
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("PAYMENT DETAILS", 50, totalsY);
    doc.font("Helvetica").text(`Bank: ${bankName}`, 50, totalsY + 15);
    doc.text(`Account: ${bankAccName}`, 50, totalsY + 27);
    doc.text(`BSB: ${bankBsb}`, 50, totalsY + 39);
    doc.text(`Acc No: ${bankAcc}`, 50, totalsY + 51);
    doc
      .font("Helvetica-Bold")
      .text(`Reference: ${invoiceNum}`, 50, totalsY + 67);

    doc.font("Helvetica");
    doc.text("Subtotal:", 380, totalsY + 15, { width: 100, align: "right" });
    doc.text(`$${subtotal.toFixed(2)}`, 480, totalsY + 15, {
      width: 70,
      align: "right",
    });

    if (gstAmount > 0) {
      doc.text("GST (10%):", 380, totalsY + 30, { width: 100, align: "right" });
      doc.text(`$${gstAmount.toFixed(2)}`, 480, totalsY + 30, {
        width: 70,
        align: "right",
      });
    } else {
      doc.text("GST (GST-Free):", 380, totalsY + 30, {
        width: 100,
        align: "right",
      });
      doc.text("$0.00", 480, totalsY + 30, { width: 70, align: "right" });
    }

    doc
      .moveTo(380, totalsY + 45)
      .lineTo(550, totalsY + 45)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL AMOUNT:", 350, totalsY + 55, {
      width: 130,
      align: "right",
    });
    doc.text(`$${totalAmount.toFixed(2)}`, 480, totalsY + 55, {
      width: 70,
      align: "right",
    });

    doc.moveDown(4);
    let paymentDueDays = settingsMap.paymentDueDays || 14;
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `THANK YOU FOR YOUR BUSINESS. PAYMENT IS DUE WITHIN ${paymentDueDays} DAYS.`,
        50,
        doc.y,
        { align: "center" },
      );
  };

