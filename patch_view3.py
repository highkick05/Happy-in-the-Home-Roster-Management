with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

# Fix Client Select
old_client = """              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-brand-navy text-[13px] text-white outline-none min-w-[150px] border border-border-subtle rounded px-1.5 py-0.5"
              >"""
new_client = """              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-transparent text-[13px] text-white outline-none min-w-[150px] [color-scheme:dark]"
              >"""
code = code.replace(old_client, new_client)

# Fix DatePickers
old_from = '<CustomDatePicker selected={fromDate} onDateChange={(d) => setFromDate(d)} position="bottom" />'
new_from = '<CustomDatePicker selected={fromDate} onDateChange={(d) => setFromDate(d)} position="bottom" className="bg-transparent text-[13px] text-white outline-none w-full border-none p-0 focus:ring-0" />'

old_to = '<CustomDatePicker selected={toDate} onDateChange={(d) => setToDate(d)} position="bottom" />'
new_to = '<CustomDatePicker selected={toDate} onDateChange={(d) => setToDate(d)} position="bottom" className="bg-transparent text-[13px] text-white outline-none w-full border-none p-0 focus:ring-0" />'

code = code.replace(old_from, new_from)
code = code.replace(old_to, new_to)

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)

