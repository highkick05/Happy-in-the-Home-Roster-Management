import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

helper = """
export function TaskCard({
"""

helper_replacement = """
const getFileIconUrl = (ext?: string) => {
  const e = (ext || '').toLowerCase();
  let type = '';
  if (['pdf'].includes(e)) type = 'file_type_pdf';
  else if (['doc', 'docx'].includes(e)) type = 'file_type_word';
  else if (['xls', 'xlsx', 'csv'].includes(e)) type = 'file_type_excel';
  else if (['ppt', 'pptx'].includes(e)) type = 'file_type_powerpoint';
  else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) type = 'file_type_zip';
  else if (['txt', 'md', 'rtf', 'log'].includes(e)) type = 'file_type_text';
  else if (['mp3', 'wav', 'ogg', 'flac'].includes(e)) type = 'file_type_audio';
  else if (['mp4', 'avi', 'mkv', 'mov'].includes(e)) type = 'file_type_video';
  else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(e)) type = 'file_type_image';
  else return 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
  
  return `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${type}.svg`;
};

export function TaskCard({
"""

if helper in code and "getFileIconUrl" not in code:
    code = code.replace(helper, helper_replacement)

target1 = """<File className="w-5 h-5 text-[#8B949E] shrink-0" />"""
replacement1 = """<img src={getFileIconUrl(file.filename?.split('.').pop())} alt="file" className="w-5 h-5 shrink-0 object-contain drop-shadow-sm" onError={(e) => e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg'} />"""

if target1 in code:
    code = code.replace(target1, replacement1)
    
target2 = """const src = type ? `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${type}.svg` : 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
             return (
               <img 
                 src={src} 
                 alt={ext || 'file'} 
                 className="w-12 h-12 object-contain drop-shadow-sm"
                 onError={(e) => {
                   e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
                 }}
               />
             );"""
             
replacement2 = """return (
               <img 
                 src={getFileIconUrl(ext)} 
                 alt={ext || 'file'} 
                 className="w-12 h-12 object-contain drop-shadow-sm"
                 onError={(e) => {
                   e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
                 }}
               />
             );"""

if "type =" in target2: # ensure we don't break stuff blindly
    # Actually wait, target2 was my previous edit. Let's just do a manual replace for the top banner.
    pass

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)

print("Updated TaskModal File Icons")
