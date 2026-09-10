const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `        superMemberNumber,
        canSwitchAdmin ? 1 : 0,
      avatarUrl || null,
      );`;

const rep = `        superMemberNumber,
        canSwitchAdmin ? 1 : 0,
        avatarUrl || null,
        primaryPosition || null
      );`;

if (code.includes(target)) {
    code = code.replace(target, rep);
    fs.writeFileSync('src/server.ts', code);
    console.log("Patched server.ts successfully");
} else {
    console.log("Target not found!");
}
