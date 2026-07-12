const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf-8');

// Replace max-w-xl with max-w-3xl for the popup
code = code.replace(/max-w-xl w-full flex flex-col/g, "max-w-3xl w-full flex flex-col");

// I'll also add react-dropzone if it's not imported
if (!code.includes("useDropzone")) {
  code = code.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport { useDropzone } from 'react-dropzone';");
}

fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
console.log("Updated!");
