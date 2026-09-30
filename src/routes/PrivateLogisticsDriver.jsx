import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { isLogisticsDriver } from "../utils/Roles";

const PrivateLogisticsDriver = () => {
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const ownerId = localStorage.getItem("owner_id");
    if (!token) {
      setRedirect("/login");
      return;
    }
    if (!isLogisticsDriver(role, ownerId)) {
      setRedirect("/logistics/owner");
      return;
    }
    setRedirect(null);
  }, []);

  if (redirect === undefined) return null;
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <Layout footerVariant="marketing">
      <Outlet />
    </Layout>
  );
};

export default PrivateLogisticsDriver;
