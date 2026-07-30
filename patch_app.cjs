const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const providerImport = "import { ChatNotificationProvider } from './context/ChatNotificationContext';\n";
if (!content.includes('ChatNotificationProvider')) {
  content = content.replace("import { AuthProvider } from './context/AuthContext';", providerImport + "import { AuthProvider } from './context/AuthContext';");
  content = content.replace("<BrowserRouter>", "<BrowserRouter>\n        <ChatNotificationProvider>");
  content = content.replace("</BrowserRouter>", "        </ChatNotificationProvider>\n        </BrowserRouter>");
  fs.writeFileSync('src/App.tsx', content);
}
