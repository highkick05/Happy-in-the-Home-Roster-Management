const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// I need to add one more </div> before the final );
code = code.replace(/    <\/div>\n  \);\n}/, '    </div>\n    </div>\n  );\n}');

fs.writeFileSync(file, code);
