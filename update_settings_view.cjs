const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

if (!content.includes('RefreshCw')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, RefreshCw } from 'lucide-react';");
}

const functionStr = `
  const handleRegeneratePdfs = async () => {
    if (!window.confirm("Are you sure you want to regenerate all PAID invoice PDFs? This may take some time depending on the number of invoices.")) return;
    setGeneralLoading(true);
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/invoices/regenerate-pdfs', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(\`Successfully synchronized \${data.generated} invoice PDFs to the filesystem.\`);
      } else {
        alert(data.error || 'Failed to regenerate PDFs');
      }
    } catch (e) {
      alert('Error regenerating PDFs');
    } finally {
      setGeneralLoading(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };
`;

if (!content.includes('handleRegeneratePdfs')) {
    content = content.replace('const handleSaveSettings', functionStr + '\n  const handleSaveSettings');
}

const buttonStr = `              <div className="pt-6 flex gap-4">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
                <button type="button" onClick={handleRegeneratePdfs} disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-brand-navy border border-border-subtle text-[#E6EDF3] text-[13px] font-medium rounded-md hover:bg-brand-gray transition-colors disabled:opacity-50 shadow-sm">
                  <RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Bulk Sync Paid Invoice PDFs
                </button>
              </div>`;

content = content.replace(
  /<div className="pt-6">[\s\S]*?<button type="submit"[\s\S]*?<\/button>[\s\S]*?<\/div>/,
  buttonStr
);

fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
console.log("Updated SettingsView");
