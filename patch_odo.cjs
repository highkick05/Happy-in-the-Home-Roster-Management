const fs = require('fs');
const file = 'src/components/Compliance/ComplianceDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Start Odometer
code = code.replace(
  /<button onClick=\{[^}]+\} className="text-\[#8B949E\] hover:text-\[#E6EDF3\] transition-colors">\s*<Camera className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<div className="absolute bottom-full left-1\/2 -translate-x-1\/2 mb-2 hidden group-hover:block z-50">\s*<div className="bg-\[#121214\] border border-border-subtle rounded-md shadow-xl p-1 w-48">\s*<img src=\{row\.odometer_start_photo\} alt="Start Odometer" className="w-full h-auto rounded object-cover" \/>\s*<\/div>\s*<div className="w-2 h-2 bg-\[#121214\] border-r border-b border-border-subtle transform rotate-45 absolute -bottom-1 left-1\/2 -translate-x-1\/2"><\/div>\s*<\/div>/g,
  `<button onClick={() => setPreviewPhoto({url: row.odometer_start_photo, type: 'Start'})} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                                       <Camera className="w-3.5 h-3.5" />
                                     </button>`
);

// End Odometer
code = code.replace(
  /<button onClick=\{[^}]+\} className="text-\[#8B949E\] hover:text-\[#E6EDF3\] transition-colors">\s*<Camera className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<div className="absolute bottom-full left-1\/2 -translate-x-1\/2 mb-2 hidden group-hover:block z-50">\s*<div className="bg-\[#121214\] border border-border-subtle rounded-md shadow-xl p-1 w-48">\s*<img src=\{row\.odometer_end_photo\} alt="End Odometer" className="w-full h-auto rounded object-cover" \/>\s*<\/div>\s*<div className="w-2 h-2 bg-\[#121214\] border-r border-b border-border-subtle transform rotate-45 absolute -bottom-1 left-1\/2 -translate-x-1\/2"><\/div>\s*<\/div>/g,
  `<button onClick={() => setPreviewPhoto({url: row.odometer_end_photo, type: 'End'})} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                                       <Camera className="w-3.5 h-3.5" />
                                     </button>`
);

// add modal to end of the file, right before the last closing div of ComplianceDashboard
// We can find `</div>\n    </div>\n  );\n}` at the end of the file
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

// We need to insert this modal before the final `</div>\n    </div>\n  );\n}`
// Let's just do a string replacement on the last `</div>\n    </div>\n  );`
const searchStr = '</div>\n    </div>\n  );\n}';
if (code.includes(searchStr)) {
  code = code.replace(searchStr, modalHtml + '\n' + searchStr);
} else {
    const searchStr2 = '</div>\n    </div>\n  );\n}';
    code = code.replace(/<\/div>\s*<\/div>\s*\);\s*}\s*$/, modalHtml + '\n</div>\n    </div>\n  );\n}');
}

fs.writeFileSync(file, code);
