const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf-8');

if (!code.includes("import { useDropzone } from 'react-dropzone';")) {
  code = code.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport { useDropzone } from 'react-dropzone';");
  fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
  console.log("Fixed useDropzone import!");
} else {
  console.log("Already imported.");
}

let serverCode = fs.readFileSync('src/server.ts', 'utf-8');
serverCode = serverCode.replace(/const clientNameSafe = \`\$\{client\.first_name \|\| ""\} \$\{client\.last_name \|\| ""\}\`\.trim\(\)\.replace\(\/\[\\\\\/\\\\\\\\\]\/g, ""\);/g, 'const clientNameSafe = `${(client as any).first_name || ""} ${(client as any).last_name || ""}`.trim().replace(/[\\\\/\\\\]/g, "");');
fs.writeFileSync('src/server.ts', serverCode);
console.log("Fixed server typings!");

