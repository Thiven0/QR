import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const PublicLayout = () => (
  <div className="min-h-screen bg-[#f8fafc]">
    <PublicNavbar />
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Outlet />
    </main>
  </div>
);

export default PublicLayout;
