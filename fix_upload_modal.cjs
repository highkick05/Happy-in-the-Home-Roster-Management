const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf-8');
code = code.replace(
  'const [uploadClientId, setUploadClientId] = useState(\'\');',
  'const [uploadClientId, setUploadClientId] = useState(\'\');\n  const [isDragging, setIsDragging] = useState(false);'
);
code = code.replace(
  '<div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-md w-full flex flex-col">',
  '<div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-xl w-full flex flex-col">'
);
const searchFile = `              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Invoice PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-teal/20 file:text-brand-teal hover:file:bg-brand-teal/30"
                />
              </div>`;
const replaceFile = `              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Invoice PDF</label>
                <div 
                  className={\`w-full bg-black/40 border-2 border-dashed \${isDragging ? 'border-brand-teal bg-brand-teal/10' : 'border-white/[0.08] hover:border-white/20'} rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer relative\`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.type === 'application/pdf') {
                        setUploadFile(file);
                      } else {
                        alert('Please upload a PDF file.');
                      }
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    required={!uploadFile}
                    onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center space-y-3 pointer-events-none">
                    <FileText className={\`w-10 h-10 \${uploadFile ? 'text-brand-teal' : 'text-zinc-500'}\`} />
                    {uploadFile ? (
                      <span className="text-[14px] text-brand-teal font-medium text-center">{uploadFile.name}</span>
                    ) : (
                      <>
                        <span className="text-[14px] text-zinc-300 font-medium">Click or drag PDF here</span>
                        <span className="text-[12px] text-zinc-500">Maximum file size 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>`;
code = code.replace(searchFile, replaceFile);
fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
