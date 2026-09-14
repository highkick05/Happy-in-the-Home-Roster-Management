const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const targetStr = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}`;

const newStr = `<div className="pt-6 flex gap-4">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
                <button type="button" onClick={handleRegeneratePdfs} disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-brand-navy border border-border-subtle text-[#E6EDF3] text-[13px] font-medium rounded-md hover:bg-brand-gray transition-colors disabled:opacity-50 shadow-sm">
                  <RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Repair Invoices
                </button>
              </div>
            </form>
          </div>
        )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    
    // Remove the old button from general tab
    const oldBtnBlock = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
                               </div>`;
    const cleanBtnBlock = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>`;
    content = content.replace(oldBtnBlock, cleanBtnBlock);
    
    fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
    console.log("Fixed button location!");
} else {
    console.log("Could not find target string to replace");
}
