import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from '../modules/auth/context/AuthProvider';
import ProtectedRoute from '../modules/auth/components/ProtectedRoute';
import GuardLogin from '../modules/auth/pages/GuardLogin';
import DashboardLayout from '../modules/dashboard/layouts/DashboardLayout';
import DashboardOverview from '../modules/dashboard/pages/DashboardOverview';
import DashboardStats from '../modules/dashboard/pages/DashboardStats';
import UserVehicles from '../modules/dashboard/pages/UserVehicles';
import QRScannerPage from '../modules/dashboard/components/QRScanner';
import RegisterUser from '../modules/dashboard/pages/RegisterUser';
import RegisterGuard from '../modules/dashboard/pages/RegisterGuard';
import UserDirectory from '../modules/dashboard/pages/UserDirectory';
import RegistroDirectory from '../modules/dashboard/pages/RegistroDirectory';
import SectionsGuide from '../modules/dashboard/pages/SectionsGuide';
import ProfileUser from '../modules/dashboard/pages/ProfileUser';
import PublicLayout from '../modules/public/layouts/PublicLayout';
import RegisterVisitor from '../modules/public/pages/RegisterVisitor';
import NotFound from '../pages/NotFound';
import useAuth from '../modules/auth/hooks/useAuth';

const DashboardHome = () => {
  const { hasPermission } = useAuth();
  if (hasPermission(['Administrador', 'Celador'])) {
    return <DashboardOverview />;
  }
  return <Navigate to="/dashboard/profile" replace />;
};

export const Routing = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<GuardLogin />} />
            <Route path="register-visitor" element={<RegisterVisitor />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route
              path="vehicles"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <UserVehicles />
                </ProtectedRoute>
              }
            />
            <Route
              path="qr"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <QRScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="statistics"
              element={
                <ProtectedRoute allowed={['Administrador']}>
                  <DashboardStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="users/register"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <RegisterUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="users/directory"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <UserDirectory />
                </ProtectedRoute>
              }
            />
            <Route
              path="records/history"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <RegistroDirectory />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<ProfileUser />} />
            <Route
              path="staff/register"
              element={
                <ProtectedRoute allowed={['Administrador']}>
                  <RegisterGuard />
                </ProtectedRoute>
              }
            />
            <Route
              path="sections"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <SectionsGuide />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
