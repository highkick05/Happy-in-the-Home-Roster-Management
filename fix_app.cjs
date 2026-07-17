const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const { logout, user, settings, token } = useAuth();',
  'const { logout, user, settings, token, switchRole } = useAuth();'
);

const switchButton = `
          {user?.canSwitchAdmin && (
            <div className="flex px-2 pb-2">
              <button 
                onClick={() => switchRole(user.role === 'ADMIN' ? 'STAFF' : 'ADMIN')}
                className="w-full flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold tracking-wide bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 border border-brand-teal/30 rounded-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 
                {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (user.role === 'ADMIN' ? 'Switch to Staff' : 'Switch to Admin') : ''}
              </button>
            </div>
          )}
`;

code = code.replace(
  '<div className="mb-2 px-3 text-xs text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>\n          ) : null}',
  '<div className="mb-2 px-3 text-xs text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>\n          ) : null}\n' + switchButton
);

fs.writeFileSync('src/App.tsx', code);
