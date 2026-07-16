import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''          <CustomDatePicker 
            value={dateFrom} 
            onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}
            onDateChange={(d: any) => setDateFrom(d ? d.toISOString().split('T')[0] : '')}''',
'''          <CustomDatePicker 
            value={dateFrom} 
            onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}'''
)

code = code.replace(
'''          <CustomDatePicker 
            value={dateTo} 
            onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}
            onDateChange={(d: any) => setDateTo(d ? d.toISOString().split('T')[0] : '')}''',
'''          <CustomDatePicker 
            value={dateTo} 
            onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
