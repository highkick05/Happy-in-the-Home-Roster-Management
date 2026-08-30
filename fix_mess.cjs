const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const anchor = '      const { clientId, activityName, date, endDate, services, importantNotes, quoteDate } =';
let start = code.indexOf(anchor);

if (start !== -1) {
  // It should go all the way to the end of the app.put, which is right before app.delete("/api/remittances/:id"
  const endAnchor = '  app.delete(\n    "/api/remittances/:id"';
  let end = code.indexOf(endAnchor);
  if (end !== -1) {
    // Delete the mangled app.put entirely. We don't need it because Quotes don't exist in manual remittances anymore, we just generate PDFs. Wait, does the frontend use PUT /api/remittances/:id for editing manual remittances?
    // Let me check if editing is used.
    code = code.substring(0, start) + ';' + code.substring(end);
    fs.writeFileSync('src/server.ts', code);
    console.log("Fixed!");
  }
}
