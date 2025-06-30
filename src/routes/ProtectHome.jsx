import { Navigate, Outlet } from 'react-router-dom';

const ProtectHome = () => {
  const token = window.localStorage.getItem("token");
  const role = window.localStorage.getItem("role");

  if (!token) {
    return <Outlet/>
  }

  if (role == "1") {
    return <Outlet />;
  }

  if (role == "2") {
    return <Navigate to="/requests" replace />;
  }

  return <Navigate to="/" replace />;
};

export default ProtectHome;
