import { Outlet } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardSidebar from '../components/DashboardSidebar';

const DashboardLayout = () => {
  const { hasPermission } = useAuth();
  const showSidebar = hasPermission(['Administrador', 'Celador']);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardNavbar />
      {showSidebar && <DashboardSidebar />}
      <main className={`min-h-screen pt-20 transition-all ${showSidebar ? 'sm:ml-64' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
