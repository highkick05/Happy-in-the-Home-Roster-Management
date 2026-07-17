const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      const appUrl =
        process.env.APP_URL || process.env.BASE_URL || "http://localhost:3000";
      const resetLink = \`\${appUrl}/reset-password/\${token}\`;`;

const replacementStr = `      const appUrl =
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
        process.env.APP_URL || process.env.BASE_URL || "http://localhost:3000";
      const resetLink = \`\${appUrl}/reset-password/\${token}\`;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched resetLink generation');
} else {
  console.log('Target string not found');
}
