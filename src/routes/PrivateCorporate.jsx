import { useEffect, useState } from "react";
import { useDispatch } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import CustomerActions from '../Redux/Actions/CustomerActions';

const PrivateCorporate = () => {
  const dispatch = useDispatch();
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (!token) {
        setRedirect('/login');
        return;
      }

      // Handle redirection for non-corporate roles
      if (role === "1") {
        setRedirect('/');
        return;
      }
      if (role === "2") {
        setRedirect('/requests'); // RequireProviderService may bounce to /service/add
        return;
      }

      if (role === "3") {
        // Check if profile is complete
        try {
          const apiRes = await dispatch(CustomerActions.getProfile());
          const isComplete = apiRes?.payload?.data?.is_completeProfile;

          if (isComplete === 0) {
            setRedirect('/provider?role=3'); // Redirect if incomplete profile
          } else {
            setRedirect(null); // Stay on this route
          }
        } catch (err) {
          console.error("Profile check failed:", err);
          setRedirect('/login');
        }
      }

    };

    checkAccess();
  }, [dispatch]);

  if (redirect) return <Navigate to={redirect} replace />;

  return <Outlet />;
};

export default PrivateCorporate;
