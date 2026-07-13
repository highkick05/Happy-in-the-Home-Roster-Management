with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

import re

# Add H1, H2 back
if "Heading1" not in code:
    code = code.replace("import { List as ListIcon", "import { Heading1, Heading2, List as ListIcon")

toolbar_icons_start = """<div className="flex items-center gap-1">"""
toolbar_icons_new = """<div className="flex items-center gap-1">
           <button type="button" onClick={() => insertBlock('header', { level: 1 })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 1"><Heading1 size={15} /></button>
           <button type="button" onClick={() => insertBlock('header', { level: 2 })} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Heading 2"><Heading2 size={15} /></button>
           <div className="w-px h-4 bg-white/10 mx-1" />"""

code = code.replace(toolbar_icons_start, toolbar_icons_new)

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

