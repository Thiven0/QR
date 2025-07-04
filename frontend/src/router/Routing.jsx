import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../components/layout/public/PublicLayout";
import RegisterGuard from "../pages/guard/RegisterGuard";
import LoginGuard from "../pages/guard/LoginGuard";


export const Routing = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout />} />
        <Route path="/register" element={<RegisterGuard />} />
        <Route path="/login" element={<LoginGuard />} />
      </Routes>
    </BrowserRouter>
  );
};