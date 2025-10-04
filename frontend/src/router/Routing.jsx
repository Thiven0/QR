import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from '../modules/auth/context/AuthProvider';
import ProtectedRoute from '../modules/auth/components/ProtectedRoute';
import GuardLogin from '../modules/auth/pages/GuardLogin';
import DashboardLayout from '../modules/dashboard/layouts/DashboardLayout';
import DashboardOverview from '../modules/dashboard/pages/DashboardOverview';
import QRScannerPage from '../modules/dashboard/components/QRScanner';
import RegisterUser from '../modules/dashboard/pages/RegisterUser';
import RegisterGuard from '../modules/dashboard/pages/RegisterGuard';
import UserDirectory from '../modules/dashboard/pages/UserDirectory';
import SectionsGuide from '../modules/dashboard/pages/SectionsGuide';
import PublicLayout from '../modules/public/layouts/PublicLayout';
import NotFound from '../pages/NotFound';

export const Routing = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<GuardLogin />} />
          </Route>

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route
              path="qr"
              element={
                <ProtectedRoute allowed={['Administrador', 'Celador']}>
                  <QRScannerPage />
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
              path="staff/register"
              element={
                <ProtectedRoute allowed={['Administrador']}>
                  <RegisterGuard />
                </ProtectedRoute>
              }
            />
            <Route path="sections" element={<SectionsGuide />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
