import { Navigate, Outlet } from 'react-router-dom';

const ProtectHome = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Outlet />;
  }

  if (role === "1") return <Outlet />;
  if (role === "2") return <Navigate to="/requests" replace />;
  if (role === "3") return <Navigate to="/corporate" replace />;

  return <Navigate to="/" replace />;
};

export default ProtectHome;
