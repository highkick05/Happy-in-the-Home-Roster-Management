const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const regex = /catch \(error: any\) \{\s*res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}/g;

const replacement = `catch (error: any) {
      console.error("ONBOARDING API ERROR:", error);
      res.status(500).json({ error: error.message });
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/server.ts', content);
