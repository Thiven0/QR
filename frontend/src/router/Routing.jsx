import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GuardLayout from "../components/layout/guard/GuardLayout";
import RegisterGuard from "../pages/guard/RegisterGuard";
import LoginGuard from "../pages/guard/LoginGuard";
import QRGuard from "../components/QRScanner";
import RegisterUser from "../pages/users/RegisterUser";
import MainLogin from "../pages/MainLogin";
import NotFound from "../pages/NotFound";
import AuthProvider from "../context/AuthProvider";
import PublicLayout from "../components/layout/public/PublicLayout";
import Content from "../components/layout/guard/Content";
import LoginGeneral from "../pages/LoginGeneral";

export const Routing = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<MainLogin />} />
          </Route>

          <Route path="/guard" element={<GuardLayout />}>
            <Route index element={<Content />} />
            <Route path="register" element={<RegisterGuard />} />
            <Route path="login" element={<LoginGuard />} />
            <Route path="qr" element={<QRGuard />} />
          </Route>

          <Route path="/admin">
            <Route path="login" element={<LoginGeneral />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
