import re

with open('src/components/Invoicing/QuotesView.tsx', 'r') as f:
    code = f.read()

# Add useDropzone, X, Upload
if 'useDropzone' not in code:
    code = code.replace("import React,", "import { useDropzone } from 'react-dropzone';\nimport React,")
if 'X,' not in code and 'X }' not in code:
    code = code.replace("import { Download,", "import { Download, X, Upload,")

# Add HistoricalDropzone component
dropzone_code = """
function HistoricalDropzone({ uploadFile, setUploadFile }: { uploadFile: File | null, setUploadFile: (f: File | null) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setUploadFile(acceptedFiles[0]);
      }
    }
  });

  return (
    <div 
      {...getRootProps()}
      className={`w-full bg-black/40 border-2 border-dashed ${isDragActive ? 'border-brand-teal bg-brand-teal/10' : 'border-white/[0.08] hover:border-white/20'} rounded-lg p-12 flex flex-col items-center justify-center transition-colors cursor-pointer`}
    >
      <input {...getInputProps()} required={!uploadFile} />
      <div className="flex flex-col items-center space-y-3 pointer-events-none">
        {uploadFile ? (
          <span className="text-[14px] text-brand-teal font-medium text-center">{uploadFile.name}</span>
        ) : (
          <span className="text-[14px] text-zinc-400 font-medium text-center">Drag & drop PDF here, or click to select</span>
        )}
      </div>
    </div>
  );
}
"""
if "function HistoricalDropzone" not in code:
    idx = code.find("export default function QuotesView() {")
    code = code[:idx] + dropzone_code + "\n" + code[idx:]

with open('src/components/Invoicing/QuotesView.tsx', 'w') as f:
    f.write(code)

