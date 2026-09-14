const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `        if (status === "PAID") {`;
const replaceStr = `        if (status === "PAID" && oldInvoice.status !== "PAID") {`;

srvContent = srvContent.replace(targetStr, replaceStr);

fs.writeFileSync('src/server.ts', srvContent);
console.log("Fixed duplicate generation bug");
