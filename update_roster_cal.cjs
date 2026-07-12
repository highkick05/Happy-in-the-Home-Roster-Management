const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');

// 1. Add import
if (!code.includes('import AddHistoricalShiftModal')) {
  code = code.replace("import AddShiftModal from './AddShiftModal';", "import AddShiftModal from './AddShiftModal';\nimport AddHistoricalShiftModal from './AddHistoricalShiftModal';");
}

// 2. Add state
if (!code.includes('const [isHistShiftModalOpen, setIsHistShiftModalOpen]')) {
  code = code.replace("const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);", "const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);\n  const [isHistShiftModalOpen, setIsHistShiftModalOpen] = useState(false);");
}

// 3. Add handle function (optional but good)
if (!code.includes('const handleAddHistShift = () =>')) {
  code = code.replace("const handleAddShift = () => {", "const handleAddHistShift = () => {\n    setSelectedEventInfo(null);\n    setIsHistShiftModalOpen(true);\n  };\n\n  const handleAddShift = () => {");
}

// 4. Add the button
const targetButton = `<button 
                    onClick={handleAddShift}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shift
                  </button>`;

const replaceButton = `<button 
                    onClick={handleAddHistShift}
                    className="flex items-center justify-center px-4 py-2 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/50 text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Historical Shift
                  </button>
                  <button 
                    onClick={handleAddShift}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shift
                  </button>`;

if (code.includes('Add Historical Shift')) {
  // Already added
} else {
  code = code.replace(targetButton, replaceButton);
}

// 5. Render Modal
if (!code.includes('<AddHistoricalShiftModal')) {
  code = code.replace('<AddShiftModal', '<AddHistoricalShiftModal \n        isOpen={isHistShiftModalOpen}\n        onClose={() => setIsHistShiftModalOpen(false)}\n        initialData={selectedEventInfo}\n        onSave={fetchShifts}\n      />\n      <AddShiftModal');
}

fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
console.log("Updated RosterCalendar.tsx");
