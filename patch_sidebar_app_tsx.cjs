const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `          <NavLink to="/roster" className={getNavClasses} title="Roster">
            <Calendar className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
          </NavLink>`;

const replacementStr = `          <NavLink to="/roster" className={getNavClasses} title="Roster">
            <Calendar className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
          </NavLink>
          
          <NavLink to="/travel-logs" className={getNavClasses} title="Travel Logs">
            <Car className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}
          </NavLink>`;

if (code.includes(targetStr) && !code.includes('to="/travel-logs"')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Added Travel Logs to sidebar');
}

const importTarget = `import {`;
// We need to import Car from lucide-react if not already imported.
const lucideImports = code.match(/import\s+\{([^}]+)\}\s+from\s+'lucide-react'/);
if (lucideImports && !lucideImports[1].includes('Car')) {
  code = code.replace(lucideImports[1], lucideImports[1] + ', Car');
  fs.writeFileSync(file, code);
  console.log('Imported Car icon');
}

// Add route logic in App.tsx (I had missed the ProtectedRoute wrap in my previous attempt)
const routeTarget = `            <Route path="/tasks" element={<ProtectedRoute adminOnly><Layout><TasksView /></Layout></ProtectedRoute>} />`;
const routeReplacement = `            <Route path="/tasks" element={<ProtectedRoute adminOnly><Layout><TasksView /></Layout></ProtectedRoute>} />
            <Route path="/travel-logs" element={<ProtectedRoute><Layout><TravelLogsView /></Layout></ProtectedRoute>} />`;

if (code.includes(routeTarget) && !code.includes('path="/travel-logs"')) {
  code = code.replace(routeTarget, routeReplacement);
  fs.writeFileSync(file, code);
  console.log('Added Route');
}
