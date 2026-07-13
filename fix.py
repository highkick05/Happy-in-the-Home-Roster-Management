with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

import re

# Find the end of useEffect
# The structure is:
#   useImperativeHandle(ref, () => ({ ... }));
#   [some duplicate code]
#   return ( ... );
# });
# EditorJSWrapper.displayName = 'EditorJSWrapper';
# export default EditorJSWrapper;

match = re.search(r'(useImperativeHandle\(ref, \(\) => \(\{.*?\}\)\);).*?(EditorJSWrapper\.displayName = \'EditorJSWrapper\';)', code, re.DOTALL)
if match:
    new_end = match.group(1) + """

  const insertBlock = (type: string, data: any = {}) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.blocks.insert(type, data);
      editorInstanceRef.current.caret.setToBlock('end');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/progress-notes/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.file) {
        insertBlock('image', { file: data.file });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`editorjs-container flex flex-col ${readOnly ? 'read-only' : ''}`}>
      {!readOnly && (
        <div className="flex items-center gap-1 bg-zinc-800/80 border-b border-white/[0.05] p-1.5 px-3 rounded-t-md">
           <button type="button" onClick={() => insertBlock('header', { level: 1 })} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 1"><Heading1 size={15} /></button>
           <button type="button" onClick={() => insertBlock('header', { level: 2 })} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 2"><Heading2 size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <button type="button" onClick={() => insertBlock('list', { style: 'unordered' })} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Bullet List"><ListIcon size={15} /></button>
           <button type="button" onClick={() => insertBlock('list', { style: 'ordered' })} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Numbered List"><ListOrdered size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />
           <label className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer" title="Upload Image">
             <ImageIcon size={15} />
             <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
           </label>
        </div>
      )}
      <div 
        className={`prose prose-invert max-w-none text-sm editorjs-wrapper bg-black/20 p-3 rounded-b-md min-h-[100px]`}
        ref={editorContainerRef} 
      />
    </div>
  );
});

""" + match.group(2) + "\nexport default EditorJSWrapper;\n"
    
    code = code[:match.start()] + new_end

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)
