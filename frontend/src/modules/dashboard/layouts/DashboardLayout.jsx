import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardSidebar from '../components/DashboardSidebar';

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 640px)').matches;
};

const DashboardLayout = () => {
  const { hasPermission } = useAuth();
  const showSidebar = hasPermission(['Administrador', 'Celador']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState);

  useEffect(() => {
    if (!showSidebar) {
      setIsSidebarOpen(false);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) {
      setIsSidebarOpen(true);
    }
  }, [showSidebar]);

  const handleToggleSidebar = () => {
    if (!showSidebar) return;
    setIsSidebarOpen((previous) => !previous);
  };

  const handleCloseSidebar = () => {
    if (!showSidebar) return;
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardNavbar onToggleSidebar={handleToggleSidebar} isSidebarOpen={isSidebarOpen && showSidebar} />
      {showSidebar && <DashboardSidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} onToggle={handleToggleSidebar} />}
      <main
        className={`min-h-screen pt-28 transition-[margin] duration-300 ${showSidebar ? (isSidebarOpen ? 'sm:ml-64' : 'sm:ml-0') : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
