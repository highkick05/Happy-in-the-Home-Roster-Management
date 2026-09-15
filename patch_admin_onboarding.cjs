const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'import OnboardingView from \'./components/Onboarding/OnboardingView\';',
  'import OnboardingView from \'./components/Onboarding/OnboardingView\';\nimport AdminOnboardingHub from \'./components/AdminOnboarding/AdminOnboardingHub\';'
);

content = content.replace(
  '<Route path="/settings" element={<ProtectedRoute adminOnly><Layout><SettingsView /></Layout></ProtectedRoute>} />',
  '<Route path="/admin-onboarding" element={<ProtectedRoute adminOnly><Layout><AdminOnboardingHub /></Layout></ProtectedRoute>} />\n            <Route path="/settings" element={<ProtectedRoute adminOnly><Layout><SettingsView /></Layout></ProtectedRoute>} />'
);

content = content.replace(
  '<NavLink replace={true} to="/compliance" className={getNavClasses} title="Compliance">',
  `{user?.role === 'ADMIN' && (
              <NavLink replace={true} to="/admin-onboarding" className={getNavClasses} title="Admin Onboarding">
                <FileCheck className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Onboarding Hub' : ''}
              </NavLink>
            )}
            <NavLink replace={true} to="/compliance" className={getNavClasses} title="Compliance">`
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log("Patched App.tsx successfully");
