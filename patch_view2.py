with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

bad_str = """              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-brand-navy text-[13px] text-white outline-none min-w-[150px] border border-border-subtle rounded px-1.5 py-0.5"
              > setSelectedClientId(e.target.value)}
                className="bg-transparent text-[13px] text-white outline-none min-w-[150px] [color-scheme:dark]"
              >"""

good_str = """              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-brand-navy text-[13px] text-white outline-none min-w-[150px] border border-border-subtle rounded px-1.5 py-0.5"
              >"""

code = code.replace(bad_str, good_str)

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)

