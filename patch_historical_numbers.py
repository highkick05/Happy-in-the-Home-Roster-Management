import re

with open('src/server.ts', 'r') as f:
    code = f.read()

# Invoice logic
old_invoice = """        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\.[^/.]+$/, "");"""
        
new_invoice = """        const originalName = file.originalname || "historical-invoice.pdf";
        let invoiceNum = originalName.replace(/\.[^/.]+$/, "");
        
        // Ensure unique invoice number
        let existingInvoice = db.prepare("SELECT id FROM invoices WHERE invoice_number = ?").get(invoiceNum);
        let invoiceCounter = 1;
        while (existingInvoice) {
            invoiceNum = `${originalName.replace(/\.[^/.]+$/, "")}-${invoiceCounter}`;
            existingInvoice = db.prepare("SELECT id FROM invoices WHERE invoice_number = ?").get(invoiceNum);
            invoiceCounter++;
        }"""
code = code.replace(old_invoice, new_invoice)

# Quote logic
old_quote = """        const fallbackNum = `QUO-HIST-${Date.now()}`;
        
        db.prepare(`
          INSERT INTO quotes ("""
new_quote = """        const fallbackNum = `QUO-HIST-${Date.now()}`;
        
        let finalQuoteNum = quoteNum || fallbackNum;
        let existingQuote = db.prepare("SELECT id FROM quotes WHERE quote_number = ?").get(finalQuoteNum);
        let quoteCounter = 1;
        while (existingQuote) {
            finalQuoteNum = `${quoteNum || fallbackNum}-${quoteCounter}`;
            existingQuote = db.prepare("SELECT id FROM quotes WHERE quote_number = ?").get(finalQuoteNum);
            quoteCounter++;
        }

        db.prepare(`
          INSERT INTO quotes ("""
code = code.replace(old_quote, new_quote)

# Change quoteNum to finalQuoteNum in the run call
old_quote_run = """        `).run(
          parseInt(clientId),
          quoteNum || fallbackNum,"""
new_quote_run = """        `).run(
          parseInt(clientId),
          finalQuoteNum,"""
code = code.replace(old_quote_run, new_quote_run)


with open('src/server.ts', 'w') as f:
    f.write(code)
print("Replaced successfully")
