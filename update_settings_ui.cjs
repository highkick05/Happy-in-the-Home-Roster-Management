const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const oldButtonCode = `<button type="button" onClick={handleRegeneratePdfs} disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-brand-navy border border-border-subtle text-[#E6EDF3] text-[13px] font-medium rounded-md hover:bg-brand-gray transition-colors disabled:opacity-50 shadow-sm">
                  <RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Repair Invoices
                </button>`;

if (content.includes(oldButtonCode)) {
    content = content.replace(oldButtonCode, "");
}

// Ensure the flex gap container is fixed if the button was removed
content = content.replace(/<div className="pt-6 flex gap-4">\\s*<button type="submit"(.*?)>([\\s\\S]*?)<\\/button>\\s*<\\/div>/g, 
  '<div className="pt-6">\\n                <button type="submit"$1>$2</button>\\n              </div>');

// 2. Add the button to the BILLING tab
const billingButtonTarget = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'EMAIL'`;

const newBillingButton = `<div className="pt-6 flex items-center gap-4">
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
        )}

        {activeTab === 'EMAIL'`;

if (content.includes(billingButtonTarget)) {
    content = content.replace(billingButtonTarget, newBillingButton);
} else {
    console.log("Could not find the target for the billing button insertion.");
}

// 3. Rewrite handleRegeneratePdfs to handle the stream
const oldFuncRegex = /const handleRegeneratePdfs = async \\(\\).*?;\\n/ms;
// actually let's just do a string replacement for the exact function:
