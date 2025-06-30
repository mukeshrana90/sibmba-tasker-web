import { Navigate, Outlet } from 'react-router-dom';

const PrivateService = () => {
  const token = window.localStorage.getItem("token");
  const role = window.localStorage.getItem("role");

  if (!token) {
    return <Outlet/>
  }

  if (role == "2") {
    return <Outlet />;
  }

  if (role == "1") {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/" replace />;
};

export default PrivateService;
