import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

target = """        <div className={`p-4 border-t border-border-subtle space-y-2 shrink-0 z-10 relative bg-brand-navy ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '!px-2' : ''}`}>
          {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (
            <div className="mb-2 px-3 text-xs text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>
          ) : null}
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
          <div className={isDesktopSidebarCollapsed && !isMobileMenuOpen ? "flex flex-col space-y-2" : "flex items-center space-x-2"}>
            <NavLink to="/profile" className={(props: {isActive: boolean}) => `${getNavClasses(props)} ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'w-full' : 'flex-1'}`} title="Profile">
              <User className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Profile' : ''}
            </NavLink>
            <button onClick={handleHardReset} title="Sync / Reset App Cache" className={`flex-shrink-0 flex items-center justify-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'h-[38px] w-full' : 'h-[38px] w-[38px]'} bg-brand-navy hover:bg-brand-bg text-[#8B949E] hover:text-[#E6EDF3] border border-transparent hover:border-border-subtle rounded-lg transition-colors`}>
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <button onClick={logout} className={`flex items-center px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-white w-full ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`} title="Sign Out">
            <LogOut className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Sign Out' : ''}
          </button>
        </div>"""

replacement = """        <div className={`p-3 border-t border-border-subtle space-y-1 shrink-0 z-10 relative bg-brand-navy ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '!px-2' : ''}`}>
          {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (
            <div className="mb-1 px-2 text-[10px] text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>
          ) : null}
          {user?.canSwitchAdmin && (
            <div className="flex px-2 pb-1">
              <button 
                onClick={() => switchRole(user.role === 'ADMIN' ? 'STAFF' : 'ADMIN')}
                className="w-full flex items-center justify-center px-3 py-1 text-[10px] font-semibold tracking-wide bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 border border-brand-teal/30 rounded-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 
                {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (user.role === 'ADMIN' ? 'Switch to Staff' : 'Switch to Admin') : ''}
              </button>
            </div>
          )}
          <div className={isDesktopSidebarCollapsed && !isMobileMenuOpen ? "flex flex-col space-y-1" : "flex items-center space-x-1"}>
            <NavLink to="/profile" className={(props: {isActive: boolean}) => `${getNavClasses(props)} ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'w-full' : 'flex-1'}`} title="Profile">
              <User className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Profile' : ''}
            </NavLink>
            <button onClick={handleHardReset} title="Sync / Reset App Cache" className={`flex-shrink-0 flex items-center justify-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'h-7 w-full' : 'h-7 w-7'} bg-brand-navy hover:bg-brand-bg text-[#8B949E] hover:text-[#E6EDF3] border border-transparent hover:border-border-subtle rounded-lg transition-colors`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button onClick={logout} className={`flex items-center px-3 py-1 text-[11px] font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-white w-full ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`} title="Sign Out">
            <LogOut className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Sign Out' : ''}
          </button>
        </div>"""

if target in text:
    text = text.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Target not found")
