import re

def fix_report(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Update columnsList to include shiftId and rename travelReimbursement
    if "'shiftId'" not in text:
        text = text.replace(
            "const columnsList = [",
            "const columnsList = [\n    { id: 'shiftId', label: 'Shift ID' },"
        )
        
        text = text.replace(
            "const [visibleColumns, setVisibleColumns] = useState<string[]>([",
            "const [visibleColumns, setVisibleColumns] = useState<string[]>([\n    'shiftId',"
        )
        
        text = text.replace(
            "{visibleColumns.includes('dateAndDay')",
            "{visibleColumns.includes('shiftId') && <th className=\"px-3 py-2 min-w-[80px]\">Shift ID</th>}\n                {visibleColumns.includes('dateAndDay')"
        )
        
        text = text.replace(
            "{visibleColumns.includes('dateAndDay') && (",
            "{visibleColumns.includes('shiftId') && (\n                      <td className=\"px-3 py-2 whitespace-nowrap text-[#8B949E] text-xs font-mono\">#{row.shiftId}</td>\n                    )}\n                    {visibleColumns.includes('dateAndDay') && ("
        )

    # Rename 'Travel Reimbursement ($)' to 'REIMB ($)'
    text = text.replace("'Travel Reimbursement ($)'", "'REIMB ($)'")
    text = text.replace(">Travel Reimbursement ($)<", ">REIMB ($)<")

    with open(filepath, 'w') as f:
        f.write(text)

fix_report('src/components/Dashboard/StaffActivityReport.tsx')
