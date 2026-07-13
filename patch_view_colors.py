with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

# Update client and date backgrounds
code = code.replace('bg-zinc-800/80 px-3 py-1.5', 'bg-[#1C1D22] px-3 py-1.5')

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)

