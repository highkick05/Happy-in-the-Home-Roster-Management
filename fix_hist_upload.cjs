const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);

        // Move the file from temp upload location to the client's invoice folder
        fs.renameSync(file.path, destPath);

        const createdAt = \\\`\\\${date} 12:00:00\\\`;

        db.prepare(
          "INSERT INTO invoices (invoice_number, client_id, amount, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          invoiceNum,
          parseInt(clientId),
          0,
          newFileName,
          "PAID",
          createdAt
        );`;

const replaceStr = `        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);

        // Move the file from temp upload location to the client's invoice folder
        fs.renameSync(file.path, destPath);

        const createdAt = \`\${date} 12:00:00\`;

        db.prepare(
          "INSERT INTO invoices (invoice_number, client_id, amount, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          invoiceNum,
          parseInt(clientId),
          0,
          newFileName,
          "PAID",
          createdAt
        );

        // Add to files table so it shows up in Files tab
        try {
          const stats = fs.statSync(destPath);
          const virtualFolderPath = \`/Clients/\${clientNameSafe}/Invoices\`;
          
          let subfolder = virtualFolderPath;
          subfolder = path.normalize(subfolder).replace(/^(\\.\\.[\\\\/\\\\])+/, "");
          if (subfolder.startsWith("/")) {
            subfolder = subfolder.substring(1);
          }
          const systemName = path.posix.join(subfolder, newFileName);

          db.prepare(
            "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)"
          ).run(
            newFileName,
            systemName,
            stats.size,
            req.user.id,
            virtualFolderPath
          );
        } catch (fileErr) {
          logger.error(\`Failed to insert historical invoice into files table: \${fileErr}\`);
        }`;

if (!code.includes('const newFileName = originalName;')) {
  console.log("Could not find target string.");
} else {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
}
