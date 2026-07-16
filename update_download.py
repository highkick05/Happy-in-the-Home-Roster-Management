import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

target = """            <a 
              key={idx} 
              href={file.url} 
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] font-medium text-brand-teal hover:underline truncate"
            >"""

replacement = """            <a 
              key={idx} 
              href={file.url} 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] font-medium text-brand-teal hover:underline truncate"
              download={file.filename || (file.url && file.url.split('/').pop()) || 'Attachment'}
            >"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced download link")
else:
    print("Target not found")
    
with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)

