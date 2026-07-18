const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add import
const importTarget = `import Dashboard from "./components/Dashboard";`;
const importReplacement = `import Dashboard from "./components/Dashboard";
import TravelLogsView from "./components/TravelLogsView";`;

if (code.includes(importTarget) && !code.includes('TravelLogsView')) {
  code = code.replace(importTarget, importReplacement);
}

// Add route
const routeTarget = `            <Route path="/tasks" element={<TasksView />} />`;
const routeReplacement = `            <Route path="/tasks" element={<TasksView />} />
            <Route path="/travel-logs" element={<TravelLogsView />} />`;

if (code.includes(routeTarget) && !code.includes('path="/travel-logs"')) {
  code = code.replace(routeTarget, routeReplacement);
}

// Add to Sidebar
// Depending on how Sidebar is implemented
// Wait, the SideMenu might be inside App.tsx or a separate component. Let's find it.
fs.writeFileSync(file, code);
