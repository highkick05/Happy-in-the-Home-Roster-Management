const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// revert the first replacement
code = code.replace('    </div>\n    </div>\n  );\n};', '    </div>\n  );\n};');

// add it to the last occurrence
const lastIndex = code.lastIndexOf('    </div>\n  );\n}');
if (lastIndex !== -1) {
  code = code.substring(0, lastIndex) + '    </div>\n    </div>\n  );\n}' + code.substring(lastIndex + '    </div>\n  );\n}'.length);
}

fs.writeFileSync(file, code);
