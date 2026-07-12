const db = require('better-sqlite3')('data/dev-database.sqlite');
const fs = require('fs');
const path = require('path');

const histInvoices = db.prepare("SELECT * FROM invoices WHERE invoice_number LIKE 'HIST-%' OR (services_json IS NULL AND respite_booking_id IS NULL AND shift_id IS NULL)").all();
for (const inv of histInvoices) {
  const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(inv.client_id);
  if (!client) continue;

  const clientNameSafe = `${client.first_name || ""} ${client.last_name || ""}`.trim().replace(/[\/\\]/g, "");
  const virtualFolderPath = `/Clients/${clientNameSafe}/Invoices`;
  let subfolder = virtualFolderPath;
  subfolder = path.normalize(subfolder).replace(/^(\.\.[\/\\])+/, "");
  if (subfolder.startsWith("/")) subfolder = subfolder.substring(1);
  const systemName = path.posix.join(subfolder, inv.file_path);

  const existingFile = db.prepare("SELECT id FROM files WHERE system_name = ?").get(systemName);
  if (!existingFile) {
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', systemName);
    let size = 0;
    if (fs.existsSync(uploadDir)) {
      size = fs.statSync(uploadDir).size;
    }
    db.prepare("INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)").run(
      inv.file_path,
      systemName,
      size,
      1, // fallback admin user id
      virtualFolderPath
    );
    console.log("Backfilled:", inv.file_path);
  }
}
