const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const modalUI = `
      {showRepairModal && (
        <div className="fixed bottom-6 right-6 w-96 bg-brand-bg border border-border-subtle rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col transition-all duration-300 transform scale-100 opacity-100">
          <div className="bg-brand-navy p-3 border-b border-border-subtle flex justify-between items-center">
            <h4 className="text-sm font-semibold text-[#E6EDF3] flex items-center">
              <RefreshCw className={\`w-4 h-4 mr-2 text-brand-teal \${generalLoading ? 'animate-spin' : ''}\`} />
              Repair Invoices Activity
            </h4>
            {!generalLoading && (
              <button onClick={() => setShowRepairModal(false)} className="text-[#8B949E] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-4 bg-brand-navy/50 h-64 overflow-y-auto font-mono text-[10px] text-[#8B949E] flex flex-col gap-1">
            {repairLogs.map((log, idx) => (
              <div key={idx} className={\`\${log.startsWith('Step') ? 'text-brand-teal font-bold mt-2' : ''}\`}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/g, modalUI + '\n}\n');
fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
console.log("Added modal successfully.");
