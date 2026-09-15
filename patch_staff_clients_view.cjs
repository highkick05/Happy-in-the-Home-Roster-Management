const fs = require('fs');
let content = fs.readFileSync('src/components/Directory/StaffClientsView.tsx', 'utf8');

// Import PositionsModal
content = content.replace(
  'import StaffModal from \'./StaffModal\';',
  'import StaffModal from \'./StaffModal\';\nimport PositionsModal from \'./PositionsModal\';'
);

// Add state for modal
content = content.replace(
  'const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);',
  'const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);\n  const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);'
);

// Add button next to "Add Staff"
content = content.replace(
  '<button \n            onClick={handleAddNew}',
  `{activeTab === 'STAFF' && (
            <button 
              onClick={() => setIsPositionsModalOpen(true)}
              className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-md transition-all border border-white/10 shrink-0"
            >
              Manage Positions
            </button>
          )}
          <button 
            onClick={handleAddNew}`
);

// Add PositionsModal below StaffModal
content = content.replace(
  '<StaffModal\n        isOpen={isStaffModalOpen}',
  `<PositionsModal
        isOpen={isPositionsModalOpen}
        onClose={() => setIsPositionsModalOpen(false)}
        token={token}
      />
      
      <StaffModal
        isOpen={isStaffModalOpen}`
);

fs.writeFileSync('src/components/Directory/StaffClientsView.tsx', content, 'utf8');
console.log("Patched StaffClientsView successfully");
