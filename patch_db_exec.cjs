const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /\/\/ Auto-migrate chat_messages table to add file columns if missing[\s\S]*?\} catch \(e\) \{\s*console\.error\("Failed to migrate chat_messages table", e\);\s*\}/;

if (regex.test(code)) {
  const match = code.match(regex)[0];
  code = code.replace(match, ''); // remove it from inside db.exec
  
  // now add it outside db.exec
  const endExec = "    `);";

  if (code.includes(endExec)) {
    code = code.replace(endExec, endExec + "\n\n    " + match + "\n");
    fs.writeFileSync('src/server.ts', code);
    console.log("Patched successfully");
  } else {
    console.log("Could not find endExec exactly as written");
  }
} else {
  console.log("Could not find regex match");
}
