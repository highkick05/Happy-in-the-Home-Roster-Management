import ErrorBoundary from './components/ErrorBoundary';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import RosterCalendar from './components/Roster/RosterCalendar';
import { Calendar, Users, FileText, Settings, Home, LogOut, FolderOpen, User, FileCheck , Bell, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import ForgotPasswordView from './components/Auth/ForgotPasswordView';
import ResetPasswordView from './components/Auth/ResetPasswordView';

import StaffClientsView from './components/Directory/StaffClientsView';
import SettingsView from './components/Settings/SettingsView';
import InvoicingView from './components/Invoicing/InvoicingView';
import FilesView from './components/Files/FilesView';
import DashboardView from './components/Dashboard/DashboardView';
import StaffActivityReport from './components/Dashboard/StaffActivityReport';
import ProfileView from './components/Profile/ProfileView';
import ComplianceDashboard from './components/Compliance/ComplianceDashboard';
import ActiveShiftModal from './components/Roster/ActiveShiftModal';
import OnboardingView from './components/Onboarding/OnboardingView';
import UniversalPWAInstall from './components/UniversalPWAInstall';
import NotificationsDropdown from './components/NotificationsDropdown';
import WallboardView from './components/Kiosk/WallboardView';


function DateTimer() {
  const [now, setNow] = React.useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const dayName = days[now.getDay()];
  const dateStr = now.getDate() + ' ' + months[now.getMonth()];
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return (
    <div className="flex items-center space-x-6">
      <div className="text-2xl font-sans uppercase tracking-wide text-white">{dayName}</div>
      <NotificationsDropdown />
      <div className="flex flex-col text-right">
        <div className="text-xs font-semibold uppercase text-[#8B949E] tracking-wider">{dateStr}</div>
        <div className="text-xs font-sans text-brand-teal uppercase mt-0.5 tracking-wider">{timeStr}</div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = React.useState(false);
  
  const getNavClasses = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-lg ${
      isActive 
        ? "bg-brand-green/10 text-white [&>svg]:text-brand-green shadow-[inset_2px_0_0_0_var(--color-brand-green)]"
        : "text-[#8B949E] hover:text-white hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-brand-teal"
    } ${isDesktopSidebarCollapsed ? "justify-center !px-2" : ""}`;
  };

  const { logout, user, settings } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-brand-bg text-[#E6EDF3] font-sans overflow-hidden">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-brand-navy border-b border-border-subtle z-20 shrink-0 relative">
        <h1 className="text-lg font-sans uppercase text-[#E6EDF3] truncate tracking-widest mt-1">
          {settings?.businessName || "Happy in the Home"}
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-[#8B949E] hover:text-white transition-colors rounded-md hover:bg-white/[0.04]"
        >
          {isMobileMenuOpen ? <LogOut className="w-6 h-6 rotate-180" /> : <div className="space-y-1.5"><span className="block w-6 h-0.5 bg-current"></span><span className="block w-6 h-0.5 bg-current"></span><span className="block w-6 h-0.5 bg-current"></span></div>}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 z-40 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'w-20' : 'w-72 md:w-64'} bg-brand-navy border-r border-border-subtle flex flex-col transition-all duration-300 ease-in-out shrink-0 group`}>
        
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-14 bg-brand-navy border border-border-subtle w-7 h-7 rounded-full items-center justify-center text-[#8B949E] hover:text-white hover:border-brand-teal transition-all z-50 hover:bg-brand-teal/10"
        >
          {isDesktopSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 pb-2 flex flex-col items-center justify-center text-center ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'px-2' : ''}`}>
          {settings?.websiteLogo ? (
            <img 
              src={settings.websiteLogo} 
              alt={settings?.businessName || "Company Logo"} 
              className={`max-h-20 w-full object-contain object-center drop-shadow-lg transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'max-h-10 opacity-80' : ''}`} 
            />
          ) : (
            <h1 className={`font-sans uppercase text-[#E6EDF3] tracking-widest leading-tight transition-all ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'text-xs break-words' : 'text-2xl'}`}>
              {isDesktopSidebarCollapsed && !isMobileMenuOpen ? 'HJ' : (settings?.businessName || "Happy in the Home")}
            </h1>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto z-10 relative">
          {user?.role === 'ADMIN' && (
            <NavLink to="/" className={getNavClasses} title="Dashboard">
              <Home className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Dashboard' : ''}
            </NavLink>
          )}
          <NavLink to="/roster" className={getNavClasses} title="Roster">
            <Calendar className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Roster' : ''}
          </NavLink>
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/staff" className={getNavClasses} title="Staff & Clients">
                <Users className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Staff & Clients' : ''}
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
        </nav>

        <div className={`p-4 border-t border-border-subtle space-y-2 shrink-0 z-10 relative bg-brand-navy ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '!px-2' : ''}`}>
          {!isDesktopSidebarCollapsed || isMobileMenuOpen ? (
            <div className="mb-2 px-3 text-xs text-brand-teal font-medium tracking-wide truncate">Logged in as {user?.firstName}</div>
          ) : null}
          <NavLink to="/profile" className={getNavClasses} title="Profile">
            <User className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Profile' : ''}
          </NavLink>
          <button onClick={logout} className={`flex items-center px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.03] [&>svg]:text-[#8B949E] hover:[&>svg]:text-white w-full ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? "justify-center !px-2" : ""}`} title="Sign Out">
            <LogOut className={`w-5 h-5 ${isDesktopSidebarCollapsed && !isMobileMenuOpen ? '' : 'mr-3'}`} /> {!isDesktopSidebarCollapsed || isMobileMenuOpen ? 'Sign Out' : ''}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-brand-bg relative">
        <header className="h-12 shrink-0 border-b border-border-subtle bg-brand-bg/80 backdrop-blur-md flex items-center justify-end px-4 md:px-8 hidden md:flex sticky top-0 z-[100]">
          <DateTimer />
        </header>
        <main className="flex-1 overflow-auto p-4 md:pt-4 md:pb-6 md:px-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, staffOnly = false }: { children: React.ReactNode, adminOnly?: boolean, staffOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-black text-zinc-500">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/roster" replace />;
  }

  if (staffOnly && user.role !== 'STAFF') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  React.useEffect(() => {
    fetch('/api/app-manifest.json').then(r => r.json()).then(data => {
      const link = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (link && data.icons?.[0]?.src) {
        link.href = data.icons[0].src;
      }
      if (data.name) {
        document.title = data.name;
        const meta = document.querySelector("meta[name='apple-mobile-web-app-title']") as HTMLMetaElement;
        if(meta) meta.content = data.short_name || data.name;
      }
    }).catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <UniversalPWAInstall />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordView />} />
            <Route path="/reset-password/:token" element={<ResetPasswordView />} />
            <Route path="/kiosk/wallboard" element={<ProtectedRoute adminOnly><WallboardView /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute adminOnly><Layout><DashboardView /></Layout></ProtectedRoute>} />
            <Route path="/roster" element={<ProtectedRoute><Layout><RosterCalendar /></Layout></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute adminOnly><Layout><StaffClientsView /></Layout></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute adminOnly><Layout><InvoicingView /></Layout></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute adminOnly><Layout><StaffActivityReport /></Layout></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute adminOnly><Layout><ComplianceDashboard /></Layout></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute><Layout><FilesView /></Layout></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute staffOnly><Layout><OnboardingView /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Layout><SettingsView /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfileView /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

