import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardSidebar from '../components/DashboardSidebar';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'dashboard-sidebar-collapsed';

const getInitialCollapsedState = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const DashboardLayout = () => {
  const { hasPermission } = useAuth();
  const showSidebar = hasPermission(['Administrador', 'Celador']);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialCollapsedState);

  useEffect(() => {
    if (!showSidebar) {
      setIsMobileSidebarOpen(false);
    }
  }, [showSidebar]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
      } catch {
        return;
      }
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleBreakpointChange = (event) => {
      if (event.matches) setIsMobileSidebarOpen(false);
    };
    mediaQuery.addEventListener('change', handleBreakpointChange);
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  const handleToggleSidebar = () => {
    if (!showSidebar) return;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setIsSidebarCollapsed((previous) => !previous);
      return;
    }
    setIsMobileSidebarOpen((previous) => !previous);
  };

  const handleCloseMobileSidebar = () => {
    if (!showSidebar) return;
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardNavbar
        showSidebar={showSidebar}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onSidebarToggle={handleToggleSidebar}
      />
      {showSidebar && (
        <DashboardSidebar
          isMobileOpen={isMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onMobileClose={handleCloseMobileSidebar}
          onCollapseToggle={handleToggleSidebar}
        />
      )}
      <main
        className={`min-h-screen pt-20 transition-[margin] duration-300 md:pt-24 ${
          showSidebar ? (isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72') : ''
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
