const fs = require('fs');

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// The route
if (!appContent.includes('<Route path="/services"')) {
  appContent = appContent.replace(
    /<Route path="\/providers" element=\{<ProtectedRoute adminOnly><Layout><StaffClientsView type="PROVIDERS" \/><\/Layout><\/ProtectedRoute>\} \/>/g,
    `$&
            <Route path="/services" element={<ProtectedRoute adminOnly><Layout><StaffClientsView type="CONTRACTORS" /></Layout></ProtectedRoute>} />`
  );
}

// The Sidebar link
if (!appContent.includes('<NavLink replace={true} to="/services"')) {
  appContent = appContent.replace(
    /<NavLink replace=\{true\} to="\/providers" className=\{getNavClasses\} title="Providers">[\s\S]*?<\/NavLink>/,
    `$&
                <NavLink replace={true} to="/services" className={getNavClasses} title="Services">
                  <Briefcase className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Services' : ''}
                </NavLink>`
  );
}

// Import Briefcase
if (!appContent.includes('Briefcase')) {
  appContent = appContent.replace(
    /import \{([\s\S]*?)\} from 'lucide-react';/,
    "import { Briefcase, $1 } from 'lucide-react';"
  );
}

fs.writeFileSync('src/App.tsx', appContent);
