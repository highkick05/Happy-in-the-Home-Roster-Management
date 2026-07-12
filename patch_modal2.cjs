const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  '              <div className="flex items-center justify-between bg-[#18181b] p-3 rounded-lg border border-amber-500/30">',
  '              {(!initialData?.id || initialData?.isHistorical === 1) && (\n                <>\n                  <div className="flex items-center justify-between bg-[#18181b] p-3 rounded-lg border border-amber-500/30">'
);
code = code.replace(
  '              {isHistorical && (\n                <div className="space-y-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">',
  '                  {isHistorical && (\n                    <div className="space-y-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">'
);
code = code.replace(
  '                  </div>\n                </div>\n              )}',
  '                      </div>\n                    </div>\n                  )}\n                </>\n              )}'
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
