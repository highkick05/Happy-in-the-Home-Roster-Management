const fs = require('fs');
let content = fs.readFileSync('AGENTS.md', 'utf8');

const target = "combining physical filesystem storage in `/uploads` or `/invoices` with database tracking in the `files` table";
const replacement = "combining physical filesystem storage strictly within `/uploads` (such as `/uploads/Clients/[Client_Name]/Invoices`) with database tracking in the `files` table";

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('AGENTS.md', content);
    console.log("Patched AGENTS.md");
} else {
    console.log("Could not find target string");
}
