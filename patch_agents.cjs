const fs = require('fs');
let content = fs.readFileSync('AGENTS.md', 'utf8');

const target = "- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter this engine under any circumstances. It is mission-critical for staff compliance and training alerts. Treat this block of code as read-only.";

const replacement = `- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter this engine under any circumstances. It is mission-critical for staff compliance and training alerts. Treat this block of code as read-only.

- **DATABASE BACKUP ENGINE:** The "Automated Database Backup Engine" (which includes the \`/api/admin/database/*\` endpoints and the \`cron.schedule("0 2 * * *")\` backup task in \`src/server.ts\`) is **STRICTLY PROTECTED**.
- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter the backup engine under any circumstances. It is mission-critical for data safety. Treat this block of code as read-only.`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('AGENTS.md', content);
    console.log("Patched AGENTS.md successfully");
} else {
    console.log("Target string not found in AGENTS.md");
}
