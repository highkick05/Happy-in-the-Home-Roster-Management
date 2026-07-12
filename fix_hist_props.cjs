const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');

const target = `<AddHistoricalShiftModal 
        isOpen={isHistShiftModalOpen}
        onClose={() => setIsHistShiftModalOpen(false)}
        initialData={initialShiftData}
        onSave={fetchShifts}
      />`;

const replacement = `<AddHistoricalShiftModal 
        isOpen={isHistShiftModalOpen}
        onClose={() => setIsHistShiftModalOpen(false)}
        initialData={initialShiftData}
        onSave={fetchData}
        staffList={staffList}
        clientList={clientList}
        servicesList={servicesList}
        holidays={holidays}
      />`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
    console.log("Updated props!");
} else {
    console.log("Target not found!");
}
