const fs = require('fs');
let content = fs.readFileSync('AGENTS.md', 'utf8');

const target = `- **DATABASE BACKUP ENGINE:** The "Automated Database Backup Engine"`;

const replacement = `- **COMPLIANCE & AUDIT ENGINE:** The Evidence Matrix Generator, System Logs Ledger, and Excel Exporter logic (including \`/api/compliance/evidence/matrix\`, \`/api/compliance/logs\`, and \`/api/compliance/export/evidence\`) are **STRICTLY PROTECTED**.
- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter these compliance endpoints or the \`audit_logs\` table architecture. They are mission-critical for NDIA/Home Care auditing. Treat this block of code as read-only.

- **DATABASE BACKUP ENGINE:** The "Automated Database Backup Engine"`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('AGENTS.md', content);
    console.log("Patched AGENTS.md successfully with Compliance protection");
} else {
    console.log("Target string not found in AGENTS.md");
}
