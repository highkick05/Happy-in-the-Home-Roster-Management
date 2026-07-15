import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

old_files = """      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 text-[10px] font-medium text-[#8B949E]">
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            {fileAttachments.length} file{fileAttachments.length === 1 ? '' : 's'}
          </div>
        </div>
      )}"""

new_files = """      {fileAttachments.length > 0 && (
        <div className="flex flex-col gap-1 mb-2 pt-1 border-t border-white/[0.03]">
          {fileAttachments.map((file: any, idx: number) => (
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

code = code.replace(old_files, new_files)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
