const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const regex = /try \{\s*db\.exec\(\`\s*ALTER TABLE tasks ADD COLUMN is_reminder INTEGER DEFAULT 0;\s*\`\);\s*\} catch \(e: any\) \{\s*if \(e\.message && !e\.message\.includes\("duplicate column"\)\) \{\s*console\.warn\("Migration warning:", e\.message\);\s*\}\s*\}/;

const replacement = `try {
    db.exec(\`
      ALTER TABLE tasks ADD COLUMN is_reminder INTEGER DEFAULT 0;
    \`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(\`
      ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1;
    \`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/server.ts', content);
