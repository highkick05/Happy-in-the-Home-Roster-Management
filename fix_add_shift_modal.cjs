const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

// 1. Remove the toggle block entirely
const toggleBlockRegex = /<div className="flex items-center justify-between bg-\[#18181b\] p-3 rounded-lg border border-amber-500\/30">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/>/g;
// Wait, the structure is:
/*
              {(!initialData?.id || isHistorical) && (
                <>
                  <div className="flex items-center justify-between bg-[#18181b] p-3 rounded-lg border border-amber-500/30">
                <div>
                  <h4 className="text-[13px] font-semibold text-amber-500">Historical Shift Migration</h4>
                  <p className="text-[11px] text-zinc-400">Instantly complete shift & save manual data</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistorical(!isHistorical)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-1 ${
                    isHistorical ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      isHistorical ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
                </>
              )}
*/
// Actually, let's just do it with replace.
