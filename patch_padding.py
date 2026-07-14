import re

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

old_str = """        <div className="bg-brand-navy rounded-xl border border-border-subtle shadow-sm flex flex-col">
          <div className="px-3 py-2 border-b border-border-subtle bg-black/10">
            <h3 className="text-[14px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="">
            <div className="bg-transparent text-white">"""

new_str = """        <div className="bg-brand-navy rounded-xl border border-border-subtle shadow-sm flex flex-col">
          <div className="px-3 py-2 border-b border-border-subtle bg-black/10">
            <h3 className="text-[14px] font-semibold text-white">Add New Progress Note</h3>
          </div>
          <div className="p-3">
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-brand-bg text-white">"""

code = code.replace(old_str, new_str)

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)

