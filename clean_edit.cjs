const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/RemittancesView.tsx', 'utf8');
code = code.replace(/<button title="Edit Remittance" onClick=\{\(\) => \{ setEditingRemittance\(q\); setShowGenerateModal\(true\); \}\} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400\/10 rounded-md transition-colors"><Edit2 className="w-4 h-4" \/><\/button>/g, '');
code = code.replace(/setEditingRemittance\(null\); /g, '');
code = code.replace(/ editData=\{editingRemittance\}/g, '');
fs.writeFileSync('src/components/Invoicing/RemittancesView.tsx', code);
