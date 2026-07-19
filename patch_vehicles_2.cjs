const fs = require('fs');
let content = fs.readFileSync('src/components/VehiclesView.tsx', 'utf8');

content = content.replace(/                \);\n                }\)\n                \)\)\n              \)}/, `                );
              })
            )}`);

fs.writeFileSync('src/components/VehiclesView.tsx', content);
