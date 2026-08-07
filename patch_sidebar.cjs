const fs = require('fs');

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  /<Route path="\/providers" element=\{<ProtectedRoute adminOnly><Layout><StaffClientsView type="PROVIDERS" \/><\/Layout><\/ProtectedRoute>\} \/>/g,
  `$&
            <Route path="/services" element={<ProtectedRoute adminOnly><Layout><StaffClientsView type="CONTRACTORS" /></Layout></ProtectedRoute>} />`
);
fs.writeFileSync('src/App.tsx', appContent);

// Patch Sidebar.tsx
let sidebarContent = fs.readFileSync('src/components/Layout/Sidebar.tsx', 'utf8');
sidebarContent = sidebarContent.replace(
  /<NavLink replace=\{true\} to="\/providers" className=\{getNavClasses\} title="Providers">[\s\S]*?<\/NavLink>/,
  `$&
                <NavLink replace={true} to="/services" className={getNavClasses} title="Services">
                  <Briefcase className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Services' : ''}
                </NavLink>`
);
// Import Briefcase if not exists
if (!sidebarContent.includes('Briefcase')) {
  sidebarContent = sidebarContent.replace(
    /import \{([\s\S]*?)\} from 'lucide-react';/,
    "import { Briefcase, $1 } from 'lucide-react';"
  );
}
fs.writeFileSync('src/components/Layout/Sidebar.tsx', sidebarContent);
