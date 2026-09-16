const fs = require('fs');
let content = fs.readFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', 'utf8');

if (!content.includes("import PositionsModal")) {
  content = content.replace("import { useAuth } from '../../context/AuthContext';", "import { useAuth } from '../../context/AuthContext';\nimport PositionsModal from '../Directory/PositionsModal';");
  fs.writeFileSync('src/components/AdminOnboarding/AdminOnboardingHub.tsx', content);
}
