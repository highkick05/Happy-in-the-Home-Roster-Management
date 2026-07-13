with open("src/components/ProgressNotes/ProgressNotesView.tsx", "r") as f:
    code = f.read()

code = code.replace('<CustomDatePicker selected={fromDate} onDateChange={(d) => setFromDate(d)} />', '<CustomDatePicker selected={fromDate} onDateChange={(d) => setFromDate(d)} position="bottom" />')
code = code.replace('<CustomDatePicker selected={toDate} onDateChange={(d) => setToDate(d)} />', '<CustomDatePicker selected={toDate} onDateChange={(d) => setToDate(d)} position="bottom" />')

with open("src/components/ProgressNotes/ProgressNotesView.tsx", "w") as f:
    f.write(code)

