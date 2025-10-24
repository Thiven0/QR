import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ allowed = [], redirectTo = '/', children }) => {
  const { loading, token, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <p className="text-sm font-medium text-[#00594e]">Cargando sesión...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowed.length && !hasPermission(allowed)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ?? <Outlet />;
};

export default ProtectedRoute;
