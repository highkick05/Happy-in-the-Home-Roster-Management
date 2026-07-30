const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('import { ChatNotificationProvider }')) {
  content = content.replace(
    "import { AuthProvider, useAuth } from './context/AuthContext';",
    "import { AuthProvider, useAuth } from './context/AuthContext';\nimport { ChatNotificationProvider } from './context/ChatNotificationContext';"
  );
  fs.writeFileSync('src/App.tsx', content);
}
