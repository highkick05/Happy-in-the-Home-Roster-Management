const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('src/server.ts', 'utf-8');

const target = `
        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);
        
        // Move the file from temp upload location to the client's invoice folder
        fs.renameSync(file.path, destPath);

        const createdAt = \`\${date} 12:00:00\`;`;

const replacement = `
        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);
        
        // Move the file from temp upload location to the client's invoice folder
        fs.renameSync(file.path, destPath);

        const folderPathDb = \`/Clients/\${clientNameSafe}/Invoices\`;
        let subfolder = folderPathDb.replace(/^(\\.\\.[\\\\/\\\\])+/, "");
        if (subfolder.startsWith("/")) {
          subfolder = subfolder.substring(1);
        }
        const systemName = path.posix.join(subfolder, newFileName);
        const stats = fs.statSync(destPath);

        try {
          db.prepare(
            "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)"
          ).run(
            newFileName,
            systemName,
            stats.size,
            (req).user?.id || 1,
            folderPathDb
          );
        } catch (fileErr) {
          console.error("Failed to insert file record for historical invoice", fileErr);
        }

        const createdAt = \`\${date} 12:00:00\`;`;

if (code.includes('const folderPathDb = `/Clients/${clientNameSafe}/Invoices`;')) {
  console.log("Already fixed");
} else {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Fixed historical files insert");
}
