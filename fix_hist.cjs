const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', 'utf-8');

const regex2 = /\{\(!initialData\?\.id \|\| isHistorical\) && \(\s*<>\s*\{isHistorical && \(/;
if (regex2.test(code)) {
    code = code.replace(regex2, "{isHistorical && (");
} else {
    code = code.replace("{(!initialData?.id || isHistorical) && (\n                <>\n                                    {isHistorical && (", "{isHistorical && (");
}
fs.writeFileSync('src/components/Roster/AddHistoricalShiftModal.tsx', code);
