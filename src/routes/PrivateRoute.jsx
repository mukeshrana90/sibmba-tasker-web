import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // If not logged in
  if (!token) {
    return location.pathname === "/" ? <Outlet /> : <Navigate to="/" replace />;
  }

  // Redirect logged-in users landing on `/` based on role
  if (token && location.pathname === "/") {
    if (role === "1") return <Navigate to="/" replace />;
    if (role === "2") return <Navigate to="/requests" replace />;
    if (role === "3") return <Navigate to="/corporate" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
