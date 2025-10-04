import { Outlet } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardSidebar from '../components/DashboardSidebar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardNavbar />
      <DashboardSidebar />
      <main className="min-h-screen pt-20 sm:ml-64 transition-all">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
