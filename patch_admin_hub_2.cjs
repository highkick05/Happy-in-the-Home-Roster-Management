const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

// Wrap position fetching in a function
const useEffectRegex = /useEffect\(\(\) => \{\s*fetch\('\/api\/positions', \{ headers: \{ Authorization: \`Bearer \$\{token\}\` \} \}\)\s*\.then\(res => res\.json\(\)\)\s*\.then\(data => \{\s*if \(Array\.isArray\(data\)\) \{\s*setPositions\(data\);\s*if \(data\.length > 0\) setSelectedPositionId\(data\[0\]\.id\);\s*\}\s*\}\);\s*\}, \[token\]\);/;

const fetchPositionsCode = `const fetchPositions = () => {
    fetch('/api/positions', { headers: { Authorization: \`Bearer \${token}\` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPositions(data);
          if (data.length > 0 && !selectedPositionId) setSelectedPositionId(data[0].id);
        }
      });
  };

  useEffect(() => {
    fetchPositions();
  }, [token]);`;

content = content.replace(useEffectRegex, fetchPositionsCode);

// Add state for modal
if (!content.includes('const [isPositionsModalOpen')) {
  content = content.replace('const [isEditing, setIsEditing] = useState<number | null>(null); // step id', 'const [isEditing, setIsEditing] = useState<number | null>(null); // step id\n  const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);');
}

// Add Manage Positions button next to "Select Position"
const headerRegex = /<div className="p-4 border-b border-white\/\[0\.08\] bg-black\/20">\s*<h2 className="text-\[13px\] font-semibold text-zinc-300 uppercase tracking-wider">Select Position<\/h2>\s*<\/div>/;

const headerReplacement = `<div className="p-4 border-b border-white/[0.08] bg-black/20 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider">Select Position</h2>
              <button 
                onClick={() => setIsPositionsModalOpen(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-md transition-all border border-white/10"
              >
                Manage Positions
              </button>
            </div>`;

content = content.replace(headerRegex, headerReplacement);

// Render the modal at the end of the component
const modalRender = `
      <PositionsModal
        isOpen={isPositionsModalOpen}
        onClose={() => setIsPositionsModalOpen(false)}
        onPositionsChange={fetchPositions}
      />
    </div>
  );
}`;

content = content.replace(/<\/div>\s*\);\s*\}/, modalRender);

fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
