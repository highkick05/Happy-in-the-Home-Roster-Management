import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# 1. Ensure FileText, FileSpreadsheet, FileArchive are imported
code = code.replace("Circle, Settings } from 'lucide-react';", "Circle, Settings, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';")
if 'FileText' not in code and "Circle, Settings, FileText" not in code:
    code = code.replace("import { Clock, Check,", "import { Clock, Check, FileText, FileSpreadsheet, FileArchive,")

# 2. Update Banner Logic
banner_pattern = re.compile(r'\{\s*imageAttachments\.length\s*>\s*0\s*&&\s*\(\s*<div className="w-full">.*?</div>\s*\)\s*\}', re.DOTALL)

new_banner_code = """      {imageAttachments.length > 0 ? (
        <div className="w-full">
          {imageAttachments.map((img: any, idx: number) => (
            <a 
              key={idx}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block w-full border-b border-border-subtle"
            >
              <img src={img.url} alt={img.filename} className="w-full h-32 object-cover" />
            </a>
          ))}
        </div>
      ) : fileAttachments.length > 0 ? (
        <div className="w-full h-24 bg-[#273548] flex items-center justify-center border-b border-border-subtle">
           {(() => {
             const ext = fileAttachments[0].filename?.split('.').pop()?.toLowerCase();
             if (ext === 'pdf') return <FileText className="w-10 h-10 text-red-400" />;
             if (ext === 'docx' || ext === 'doc') return <FileText className="w-10 h-10 text-blue-400" />;
             if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="w-10 h-10 text-green-400" />;
             if (ext === 'zip' || ext === 'rar') return <FileArchive className="w-10 h-10 text-yellow-400" />;
             return <File className="w-10 h-10 text-[#8B949E]" />;
           })()}
        </div>
      ) : null}"""

code = banner_pattern.sub(new_banner_code, code, count=1)

# 3. Swap and combine file list
# First, remove the existing fileAttachments block from Kanban view
file_list_pattern = re.compile(r'\{\s*fileAttachments\.length\s*>\s*0\s*&&\s*\(\s*<div className="flex flex-col gap-1 mb-2 pt-1 border-t border-white/\[0\.03\]">.*?</div>\s*\)\s*\}', re.DOTALL)
code = file_list_pattern.sub('', code, count=1)

# Now, add the attachments block AFTER the subTasks block
subtasks_pattern = re.compile(r'(\{\s*subTasks\.length\s*>\s*0\s*&&\s*\(\s*<div className="space-y-1 mb-2 pt-1\.5 border-t border-white/\[0\.03\]">.*?</div>\s*\)\s*\})', re.DOTALL)

attachments_list_code = """\\1
      
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1 mb-2 pt-1.5 border-t border-white/[0.03]">
          {attachments.map((file: any, idx: number) => (
            <a 
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] font-medium text-brand-teal hover:underline truncate"
            >
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{file.filename || (file.url && file.url.split('/').pop()) || 'Attachment'}</span>
            </a>
          ))}
        </div>
      )}"""

code = subtasks_pattern.sub(attachments_list_code, code, count=1)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
