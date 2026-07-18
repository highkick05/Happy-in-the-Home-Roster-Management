const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /{showVehicles && \(\n        <div className="fixed inset-0 bg-black\/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={\(\) => setShowVehicles\(false\)}>\n          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-6xl w-full"/g,
  `{showVehicles && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowVehicles(false)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-4xl w-full"`
);

fs.writeFileSync(file, code);
