// src/routes/PrivateCorporate.jsx (or wherever you keep your route guards)

import { Navigate, Outlet } from 'react-router-dom';

const PrivateCorporate = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  if (role === "3") {
    return <Outlet />;
  }

  // Redirect others based on their role
  if (role === "1") return <Navigate to="/" replace />;
  if (role === "2") return <Navigate to="/requests" replace />;

  return <Navigate to="/" replace />;
};

export default PrivateCorporate;
