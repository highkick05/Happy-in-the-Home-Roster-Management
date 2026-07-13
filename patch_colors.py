with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "r") as f:
    code = f.read()

# 1. Update tag list
code = code.replace("['Behavioural', 'Health', 'Activity'].map(tag => (", "['Behavioural', 'Health', 'Activity', 'Incident'].map(tag => (")

# 2. Update background colors
# Main Add Note box
code = code.replace('className="bg-zinc-800 rounded-xl border border-white/[0.05] overflow-hidden"', 'className="bg-[#1C1D22] rounded-xl border border-white/[0.05] overflow-hidden"')

# Note Feed Item Box
code = code.replace('className="bg-zinc-800/80 rounded-lg border border-white/[0.05] p-4"', 'className="bg-[#1C1D22] rounded-xl border border-white/[0.05] p-5 shadow-sm"')

# Empty notes bg
code = code.replace('bg-zinc-800/50 rounded-xl border border-white/[0.05]', 'bg-[#1C1D22]/80 rounded-xl border border-white/[0.05]')

# Adjust the Submit button container to match dark theme
code = code.replace('className="flex justify-end p-2 border-t border-white/[0.05]"', 'className="flex justify-end p-3 bg-[#1C1D22] border-t border-white/[0.05]"')

with open("src/components/ProgressNotes/ProgressNotesFeed.tsx", "w") as f:
    f.write(code)


with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "r") as f:
    code = f.read()

# 3. Update padding on the editor text area, and its background
code = code.replace('className={`prose prose-invert max-w-none text-sm editorjs-wrapper bg-black/20 p-2 rounded-b-md min-h-[80px]`}', 'className={`prose prose-invert max-w-none text-[15px] editorjs-wrapper bg-[#0B0C0E] px-6 py-4 rounded-b-none min-h-[140px]`}')

# 4. Update the toolbar bg color to match the second screenshot 
code = code.replace('bg-zinc-800/80 border-b border-white/[0.05] p-1 px-2 rounded-t-md', 'bg-[#1C1D22] border-b border-[#0B0C0E] p-1 px-2 rounded-t-none')

with open("src/components/ProgressNotes/EditorJSWrapper.tsx", "w") as f:
    f.write(code)

