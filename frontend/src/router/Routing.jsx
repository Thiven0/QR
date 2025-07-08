import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GuardLayout from "../components/layout/guard/GuardLayout";
import RegisterGuard from "../pages/guard/RegisterGuard";
import LoginGuard from "../pages/guard/LoginGuard";
import QRGuard from "../components/QRScanner";
import RegisterUser from "../pages/users/RegisterUser";
import MainLogin from "../pages/MainLogin";
import NotFound from "../pages/NotFound";


export const Routing = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GuardLayout />} >
          <Route index element={<MainLogin/>} />
        </Route>
        <Route path="/guard" element={<GuardLayout />} >
            <Route path="/guard/register" element={<RegisterGuard />} />
            <Route path="/guard/login" element={<LoginGuard />} />
            <Route path="/guard/QR" element={<QRGuard />} />
        </Route>

        <Route path="/user" element={<GuardLayout />} >
            <Route path="/user/register" element={<RegisterUser />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};