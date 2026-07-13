import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    feed_code = f.read()

# 1. Colors
feed_code = feed_code.replace("bg-[#1C1D22]", "bg-brand-navy")
feed_code = feed_code.replace("border-white/[0.05]", "border-border-subtle")

# 2. Add New Note Padding
old_add_note = """<div className="bg-brand-navy rounded-xl border border-border-subtle p-3 shadow-sm">
          <div className="mb-2">
            <h3 className="text-[15px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="border border-border-subtle rounded-lg overflow-hidden">
            <div className="bg-transparent text-white">"""
new_add_note = """<div className="bg-brand-navy rounded-xl border border-border-subtle shadow-sm flex flex-col">
          <div className="px-3 py-2 border-b border-border-subtle bg-black/10">
            <h3 className="text-[14px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="">
            <div className="bg-transparent text-white">"""
feed_code = feed_code.replace(old_add_note, new_add_note)

old_footer = """          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#2D3325] text-[#93C55A] border border-[#93C55A]/30 px-3 py-1 rounded text-[12px] font-medium hover:bg-[#3A422F] transition-colors disabled:opacity-50 flex items-center leading-none"
            >
              Submit Note
            </button>
          </div>
        </div>"""
new_footer = """          </div>
          <div className="flex justify-end px-3 py-2 border-t border-border-subtle bg-black/10">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-brand-green/20 text-brand-green border border-brand-green/30 px-3 py-1.5 rounded text-[12px] font-medium hover:bg-brand-green/30 transition-colors disabled:opacity-50 flex items-center leading-none shadow-sm"
            >
              Submit Note
            </button>
          </div>
        </div>"""
feed_code = feed_code.replace(old_footer, new_footer)

# 3. Existing Note boxes padding & Add Delete Button
feed_code = feed_code.replace('className="bg-brand-navy rounded-xl border border-border-subtle p-3 shadow-sm"', 'className="bg-brand-navy rounded-xl border border-border-subtle p-3 shadow-sm"')

# To add Delete Note, I need to update the props to include onDeleteNote
if "onDeleteNote" not in feed_code:
    feed_code = feed_code.replace("  onEditNote: ", "  onDeleteNote?: (id: number) => Promise<void>;\n  onEditNote: ")
    feed_code = feed_code.replace("  onEditNote,\n", "  onDeleteNote,\n  onEditNote,\n")
    feed_code = feed_code.replace("  onEditNote\n", "  onDeleteNote,\n  onEditNote\n")

# Delete button in the header
old_actions = """                  <div className="flex items-center space-x-4"> 
                     <button 
                       onClick={() => handleStartEdit(note)}
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <Pencil className="w-3.5 h-3.5 mr-1.5" />
                       Edit
                     </button>
                  </div>"""
new_actions = """                  <div className="flex items-center space-x-4"> 
                     <button 
                       onClick={() => handleStartEdit(note)}
                       className="text-zinc-400 hover:text-white flex items-center text-[12px] transition-colors"
                     >
                       <Pencil className="w-3.5 h-3.5 mr-1.5" />
                       Edit
                     </button>
                     {onDeleteNote && (
                       <button 
                         onClick={() => {
                           if (window.confirm('Are you sure you want to delete this note?')) {
                             onDeleteNote(note.id);
                           }
                         }}
                         className="text-red-400/70 hover:text-red-400 flex items-center text-[12px] transition-colors"
                       >
                         <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                         Delete
                       </button>
                     )}
                  </div>"""
feed_code = feed_code.replace(old_actions, new_actions)

if "Trash2" not in feed_code:
    feed_code = feed_code.replace("import { Pencil, Save, X } from 'lucide-react';", "import { Pencil, Save, X, Trash2 } from 'lucide-react';")

# 4. Spacing inside notes (renderNoteContent)
old_prose = '<div className="prose prose-invert max-w-none text-[14px] inline-block">'
new_prose = '<div className="text-[14px] leading-relaxed block [&>p]:mb-1 [&>p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1">'
feed_code = feed_code.replace(old_prose, new_prose)

old_inline_fallback = '<div className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap inline">{contentStr}</div>'
new_inline_fallback = '<div className="text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap block">{contentStr}</div>'
feed_code = feed_code.replace(old_inline_fallback, new_inline_fallback)

# Tag badge padding (spacing between note and tag)
old_tag_badge = """                   {note.tags && (
                     <div className="mt-3 inline-block bg-white/5 px-2 py-1 rounded text-[11px] text-zinc-400 border border-white/10">"""
new_tag_badge = """                   {note.tags && (
                     <div className="mt-3 block">
                       <span className="inline-block bg-brand-navy border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
                     </div>"""
feed_code = feed_code.replace(old_tag_badge, new_tag_badge)
feed_code = feed_code.replace("</div>\n                   )}", "</span>\n                     </div>\n                   )}")

# Fix any tag badge closing issue if I messed it up... Let's just do regex for the tag part
feed_code = re.sub(r'\{note\.tags && \(\s*<div className="mt-3 inline-block bg-white/5 px-2 py-1 rounded text-\[11px\] text-zinc-400 border border-white/10">\s*Tag: \{note\.tags\}\s*</div>\s*\)', 
"""{note.tags && (
                     <div className="mt-3 block pt-1 border-t border-border-subtle/50">
                       <span className="inline-block bg-black/20 border border-border-subtle px-2 py-1 rounded text-[11px] text-zinc-400 shadow-sm">
                         Tag: {note.tags}
                       </span>
                     </div>
                   )}""", feed_code)


with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(feed_code)
    
print("Feed modified")
