const fs = require('fs');
const file = 'src/components/Compliance/ComplianceDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const modalHtml = `
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
          <div className="bg-brand-navy rounded-xl border border-border-subtle overflow-hidden max-w-6xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-brand-navy">
              <h3 className="text-lg font-semibold text-white">{previewPhoto.type} Odometer Photo</h3>
              <button onClick={() => setPreviewPhoto(null)} className="text-[#8B949E] hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 flex justify-center bg-black/30">
               {previewPhoto.url.startsWith('data:') || previewPhoto.url.startsWith('blob:') ? (
                 <img src={previewPhoto.url} alt="Odometer" className="max-w-full max-h-[85vh] rounded-lg shadow-xl object-contain" />
               ) : (
                 <img src={\`/uploads/\${previewPhoto.url}\`} alt="Odometer" className="max-w-full max-h-[85vh] rounded-lg shadow-xl object-contain" />
               )}
            </div>
          </div>
        </div>
      )}`;

// Replace the last 15 chars safely by matching the end
code = code.replace(/<\/div>\s*\)\s*;\s*}\s*$/, modalHtml + '\n    </div>\n  );\n}');

fs.writeFileSync(file, code);
