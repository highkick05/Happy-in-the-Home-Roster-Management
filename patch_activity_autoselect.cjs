const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/StaffActivityReport.tsx', 'utf8');

const target = `          <CycleSelector 
            type="payrun" 
            currentStart={dateRange.start} 
            currentEnd={dateRange.end}
            onSelect={(s, e) => setDateRange({ start: s, end: e })} 
          />`;

const rep = `          <CycleSelector 
            type="payrun" 
            currentStart={dateRange.start} 
            currentEnd={dateRange.end}
            autoSelectCurrent={true}
            onSelect={(s, e) => setDateRange({ start: s, end: e })} 
          />`;

if (code.includes(target)) {
    code = code.replace(target, rep);
    fs.writeFileSync('src/components/Dashboard/StaffActivityReport.tsx', code);
    console.log("Patched StaffActivityReport.tsx");
} else {
    console.log("Target not found!");
}
