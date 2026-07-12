const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf-8');

const dropzoneComponent = `
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
      className={\`w-full bg-black/40 border-2 border-dashed \${isDragActive ? 'border-brand-teal bg-brand-teal/10' : 'border-white/[0.08] hover:border-white/20'} rounded-lg p-12 flex flex-col items-center justify-center transition-colors cursor-pointer\`}
    >
      <input {...getInputProps()} required={!uploadFile} />
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
  );
}
`;

if (!code.includes("function HistoricalDropzone")) {
  code = code.replace("export default function InvoicingView() {", dropzoneComponent + "\nexport default function InvoicingView() {");
}

fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
console.log("Replaced!");
