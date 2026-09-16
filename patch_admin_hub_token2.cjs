const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

const regex = /<PositionsModal\s*isOpen=\{isPositionsModalOpen\}\s*onClose=\{\(\) => setIsPositionsModalOpen\(false\)\}\s*token=\{token\}\s*\/>/;
const replacement = `<PositionsModal
        isOpen={isPositionsModalOpen}
        onClose={() => {
          setIsPositionsModalOpen(false);
          fetchPositions();
        }}
        token={token}
      />`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
