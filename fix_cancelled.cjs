const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  /              "\/roster",\n            \);\n        \} catch \(err\) \{/g,
  `              "/roster",
            );
          }
        } catch (err) {`
);

fs.writeFileSync('src/server.ts', code);
