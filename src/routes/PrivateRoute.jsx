import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = () => {
    const location = useLocation();
    const token = window.localStorage.getItem("token");
    const role = window.localStorage.getItem("role");

    if (!token) {
        return location.pathname === "/" ? <Outlet /> : <Navigate to="/" replace />;
    }

    if (token && location.pathname === "/") {
        if (role === 1) {
            return<Navigate to="/" replace /> 
        } else if (role === 2) {
            return <Navigate to="/requests" replace />; 
        }
    }

    return <Outlet />;
};

export default PrivateRoute;