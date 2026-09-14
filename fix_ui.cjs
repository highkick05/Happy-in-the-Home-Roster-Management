const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

// 1. Remove the old button from general tab
const oldBtn = `<button type="button" onClick={handleRegeneratePdfs} disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-brand-navy border border-border-subtle text-[#E6EDF3] text-[13px] font-medium rounded-md hover:bg-brand-gray transition-colors disabled:opacity-50 shadow-sm">
                  <RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Repair Invoices
                </button>`;
content = content.replace(oldBtn, "");

// 2. Fix the flex gap container in general tab
content = content.replace(
  '<div className="pt-6 flex gap-4">',
  '<div className="pt-6">'
);

// 3. Add to billing tab
const billingTarget = `<div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'EMAIL'`;

const newBillingTarget = `<div className="pt-6 flex items-center gap-4">
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

content = content.replace(billingTarget, newBillingTarget);

fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
