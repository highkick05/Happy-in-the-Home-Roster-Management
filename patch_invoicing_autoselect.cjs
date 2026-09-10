const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf8');

const target = `          <CycleSelector 
            type="payrun" 
            currentStart={filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null} 
            currentEnd={filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null}
            onSelect={(s, e) => {
              setFilterStartDate(new Date(s));
              setFilterEndDate(new Date(e));
            }} 
          />`;

const rep = `          <CycleSelector 
            type="invoicing" 
            currentStart={filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null} 
            currentEnd={filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') : null}
            autoSelectCurrent={true}
            onSelect={(s, e) => {
              setFilterStartDate(new Date(s));
              setFilterEndDate(new Date(e));
            }} 
          />`;

if (code.includes(target)) {
    code = code.replace(target, rep);
    fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
    console.log("Patched InvoicingView.tsx");
} else {
    console.log("Target not found!");
}
