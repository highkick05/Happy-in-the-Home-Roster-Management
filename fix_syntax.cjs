const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `  });
    
    try {
      const persistentAssetsDir = path.join(process.cwd(), "uploads", "assets");
      if (!fs.existsSync(persistentAssetsDir)) {
        fs.mkdirSync(persistentAssetsDir, { recursive: true });
      }
      const fileName = Date.now() + "_" + req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const destPath = path.join(persistentAssetsDir, fileName);
      fs.renameSync(req.file.path, destPath);
      
      return res.json({
        success: true,
        fileUrl: \`/api/assets/\${fileName}\`
      });
    } catch (e: any) {
      console.error("Chat file upload failed", e);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, error: "Upload failed" });
    }
  });`;

if (code.includes(target)) {
  code = code.replace(target, '  });');
  fs.writeFileSync('src/server.ts', code);
  console.log("Fixed syntax");
} else {
  console.log("Could not find the target text exactly. Doing substring search...");
  const startIdx = code.indexOf('    try {\n      const persistentAssetsDir = path.join(process.cwd(), "uploads", "assets");');
  if (startIdx !== -1) {
    const endIdx = code.indexOf('  app.get("/api/chat/messages"');
    code = code.substring(0, startIdx) + code.substring(endIdx);
    fs.writeFileSync('src/server.ts', code);
    console.log("Fixed via substring");
  } else {
    console.log("Not found.");
  }
}
