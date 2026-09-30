import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { isLogisticsOwner, Roles } from "../utils/Roles";

const PrivateLogisticsOwner = () => {
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const ownerId = localStorage.getItem("owner_id");
    if (!token) {
      setRedirect("/login");
      return;
    }
    if (!isLogisticsOwner(role, ownerId)) {
      if (Number(role) === Roles.LOGISTICS && ownerId) {
        setRedirect("/logistics/driver");
      } else {
        setRedirect("/");
      }
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

export default PrivateLogisticsOwner;
