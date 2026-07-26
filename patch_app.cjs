const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import for ChatView and MessageCircle
if (!code.includes('import ChatView')) {
    code = code.replace(/import \{([^\}]+)\} from 'lucide-react';/, (match, group) => {
        if (!group.includes('MessageCircle')) {
            return `import { MessageCircle, ${group} } from 'lucide-react';`;
        }
        return match;
    });
    code = code.replace("import TravelLogsView from './components/TravelLogsView';", "import TravelLogsView from './components/TravelLogsView';\nimport ChatView from './components/Chat/ChatView';");
}

// 2. Add sidebar link
const navLinkOperations = /<div className=\{\`text-\[10px\] font-bold text-zinc-500\/80 mb-0\.5 mt-0 px-2 uppercase tracking-wider \$\{isDesktopSidebarCollapsed && !isMobileMenuOpen \? 'hidden' : 'block'\}\`\}>Operations<\/div>/;

const navLinkChat = `<div className={\`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-0 px-2 uppercase tracking-wider \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}\`}>Communication</div>
          <div className="space-y-0.5 mb-2">
            <NavLink to="/chat" className={getNavClasses} title="Live Chat">
              <MessageCircle className={\`w-5 h-5 \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}\`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Live Chat' : ''}
            </NavLink>
          </div>
          
          <div className={\`text-[10px] font-bold text-zinc-500/80 mb-0.5 mt-0 px-2 uppercase tracking-wider \${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}\`}>Operations</div>`;

if (code.match(navLinkOperations)) {
    code = code.replace(navLinkOperations, navLinkChat);
}

// 3. Add Route
const routesEnd = /<Route path="\/tasks" element=\{<ProtectedRoute adminOnly><Layout><TasksView \/><\/Layout><\/ProtectedRoute>\} \/>/;
const newRoute = `<Route path="/tasks" element={<ProtectedRoute adminOnly><Layout><TasksView /></Layout></ProtectedRoute>} />\n            <Route path="/chat" element={<ProtectedRoute><Layout><ChatView /></Layout></ProtectedRoute>} />`;

if (code.match(routesEnd)) {
    code = code.replace(routesEnd, newRoute);
}

fs.writeFileSync('src/App.tsx', code);
console.log('App patched');
