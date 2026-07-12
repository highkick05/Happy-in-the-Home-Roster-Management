const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', 'utf-8');

code = code.replace("{(!initialData?.id || isHistorical) && (\n                <>\n                                    {isHistorical && (", "{isHistorical && (");
code = code.replace("</>\n              )}", "");
fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', code);
