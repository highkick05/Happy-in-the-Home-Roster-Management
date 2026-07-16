import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

target = """        <div className="w-full h-24 bg-[#273548] flex items-center justify-center border-b border-border-subtle">
           {(() => {
             const ext = fileAttachments[0].filename?.split('.').pop()?.toLowerCase();
             if (ext === 'pdf') return <FileText className="w-10 h-10 text-red-400" />;
             if (ext === 'docx' || ext === 'doc') return <FileText className="w-10 h-10 text-blue-400" />;
             if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="w-10 h-10 text-green-400" />;
             if (ext === 'zip' || ext === 'rar') return <FileArchive className="w-10 h-10 text-yellow-400" />;
             return <File className="w-10 h-10 text-[#8B949E]" />;
           })()}
        </div>"""

replacement = """        <div className="w-full h-24 bg-[#273548] flex items-center justify-center border-b border-border-subtle overflow-hidden">
           {(() => {
             const ext = fileAttachments[0].filename?.split('.').pop()?.toLowerCase() || '';
             let type = '';
             if (['pdf'].includes(ext)) type = 'file_type_pdf';
             else if (['doc', 'docx'].includes(ext)) type = 'file_type_word';
             else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'file_type_excel';
             else if (['ppt', 'pptx'].includes(ext)) type = 'file_type_powerpoint';
             else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) type = 'file_type_zip';
             else if (['txt', 'md', 'rtf', 'log'].includes(ext)) type = 'file_type_text';
             else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) type = 'file_type_audio';
             else if (['mp4', 'avi', 'mkv', 'mov'].includes(ext)) type = 'file_type_video';
             
             const src = type ? `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${type}.svg` : 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
             return (
               <img 
                 src={src} 
                 alt={ext || 'file'} 
                 className="w-12 h-12 object-contain drop-shadow-sm"
                 onError={(e) => {
                   e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
                 }}
               />
             );
           })()}
        </div>"""

if target in code:
    code = code.replace(target, replacement)
    with open("src/components/Tasks/TaskCard.tsx", "w") as f:
        f.write(code)
    print("Successfully replaced.")
else:
    print("Target not found.")
