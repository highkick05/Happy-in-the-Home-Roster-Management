import re

with open('src/App.tsx', 'r') as f:
    text = f.read()

target = """        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto z-10 relative">
          {user?.role === 'ADMIN' && (
            <NavLink to="/tasks" className={getNavClasses} title="Tasks">
              <CheckSquare className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Tasks' : ''}
            </NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/clients" className={getNavClasses} title="Clients">
              <Heart className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Clients' : ''}
            </NavLink>
          )}
          <NavLink to="/roster" className={getNavClasses} title="Roster">
            <Calendar className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
          </NavLink>
          
          <NavLink to="/travel-logs" className={getNavClasses} title="Travel Logs">
            <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}
          </NavLink>
          <NavLink to="/vehicles" className={getNavClasses} title="Vehicles">
            <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Vehicles' : ''}
          </NavLink>

          <NavLink to="/progress-notes" className={getNavClasses} title="Progress Notes">
            <ClipboardEdit className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Progress Notes' : ''}
          </NavLink>

          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/staff" className={getNavClasses} title="Staff">
                <Users className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff' : ''}
              </NavLink>
              <NavLink to="/providers" className={getNavClasses} title="Providers">
                <Building className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Providers' : ''}
              </NavLink>
              <NavLink to="/invoices" className={getNavClasses} title="Invoicing">
                <FileText className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Invoicing' : ''}
              </NavLink>
              <NavLink to="/activity" className={getNavClasses} title="Staff Activity">
                <Activity className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff Activity' : ''}
              </NavLink>
              <NavLink to="/compliance" className={getNavClasses} title="Compliance">
                <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Compliance' : ''}
              </NavLink>
            </>
          )}

          <NavLink to="/files" className={getNavClasses} title="Files">
            <FolderOpen className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Files' : ''}
          </NavLink>

          {user?.role === 'STAFF' && (
            <NavLink to="/onboarding" className={getNavClasses} title="Onboarding Hub">
              <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Onboarding Hub' : ''}
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <NavLink to="/settings" className={getNavClasses} title="Settings">
              <Settings className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Settings' : ''}
            </NavLink>
          )}
          
          <div className="pt-4 mt-4 border-t border-border-subtle hidden">
            
          </div>
        </nav>"""

replacement = """        <nav className="flex-1 px-4 mt-6 overflow-y-auto z-10 relative">
          
          <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-4 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Operations</div>
          <div className="space-y-1">
            {user?.role === 'ADMIN' && (
              <NavLink to="/tasks" className={getNavClasses} title="Tasks">
                <CheckSquare className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Tasks' : ''}
              </NavLink>
            )}
            <NavLink to="/roster" className={getNavClasses} title="Roster">
              <Calendar className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
            </NavLink>
            <NavLink to="/progress-notes" className={getNavClasses} title="Progress Notes">
              <ClipboardEdit className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Progress Notes' : ''}
            </NavLink>
          </div>

          <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-6 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Logistics</div>
          <div className="space-y-1">
            <NavLink to="/travel-logs" className={getNavClasses} title="Travel Logs">
              <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Travel Logs' : ''}
            </NavLink>
            <NavLink to="/vehicles" className={getNavClasses} title="Vehicles">
              <Car className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Vehicles' : ''}
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/activity" className={getNavClasses} title="Staff Activity">
                <Activity className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff Activity' : ''}
              </NavLink>
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <>
              <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-6 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Directory</div>
              <div className="space-y-1">
                <NavLink to="/clients" className={getNavClasses} title="Clients">
                  <Heart className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Clients' : ''}
                </NavLink>
                <NavLink to="/staff" className={getNavClasses} title="Staff">
                  <Users className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff' : ''}
                </NavLink>
                <NavLink to="/providers" className={getNavClasses} title="Providers">
                  <Building className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Providers' : ''}
                </NavLink>
              </div>

              <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-6 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Admin & Finance</div>
              <div className="space-y-1">
                <NavLink to="/invoices" className={getNavClasses} title="Invoicing">
                  <FileText className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Invoicing' : ''}
                </NavLink>
                <NavLink to="/compliance" className={getNavClasses} title="Compliance">
                  <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Compliance' : ''}
                </NavLink>
              </div>
            </>
          )}

          <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-6 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>Resources</div>
          <div className="space-y-1">
            <NavLink to="/files" className={getNavClasses} title="Files">
              <FolderOpen className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Files' : ''}
            </NavLink>
            {user?.role === 'STAFF' && (
              <NavLink to="/onboarding" className={getNavClasses} title="Onboarding Hub">
                <FileCheck className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Onboarding Hub' : ''}
              </NavLink>
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <>
              <div className={`text-xs font-semibold text-zinc-500 mb-2 mt-6 px-2 uppercase tracking-wider ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'hidden' : 'block'}`}>System</div>
              <div className="space-y-1">
                <NavLink to="/settings" className={getNavClasses} title="Settings">
                  <Settings className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Settings' : ''}
                </NavLink>
              </div>
            </>
          )}

          <div className="pt-4 mt-6 border-t border-border-subtle hidden">
          </div>
        </nav>"""

text = text.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(text)
