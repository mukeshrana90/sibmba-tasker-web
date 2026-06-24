import React from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import LandingGuestHeader from "../../CommanComponents/Landing/LandingGuestHeader";
import SimbaMarketingFooter from "./SimbaMarketingFooter";
import { LandingProvider } from "../../context/LandingContext";
import { Roles } from "../../utils/Roles";
import { isServiceProviderPortalPath } from "../../utils/serviceProviderPaths";
import "../../Assets/css/landing.css";

export default function Layout({
  children,
  footerVariant = "default",
  headerVariant = "default",
}) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isGuest = !token;
  const isHomeLanding = location.pathname === "/";
  const isCorporateUser = token && String(role) === String(Roles.CORPORATE);
  const isServiceProvider =
    token && String(role) === String(Roles.SERVICE_PROVIDER);
  const isCorporateArea =
    isCorporateUser &&
    (location.pathname.startsWith("/corporate") ||
      location.pathname === "/edit-profile-company");
  const APP_MARKETING_PATHS = [
    "/training-material",
    "/my-stats",
    "/wallet",
    "/messages",
    "/customerreviews",
    "/allmyservices",
    "/taskslist",
    "/requests",
    "/service-pro",
  ];
  const isAppMarketingArea =
    (isCorporateUser || isServiceProvider) &&
    APP_MARKETING_PATHS.includes(location.pathname);
  const isServiceProviderArea =
    isServiceProvider && isServiceProviderPortalPath(location.pathname);

  const useLandingHeader = isGuest && headerVariant !== "app";
  const useMarketingFooter =
    footerVariant === "marketing" ||
    isCorporateArea ||
    isServiceProviderArea ||
    isAppMarketingArea ||
    (isGuest && footerVariant !== "app") ||
    (isHomeLanding && footerVariant !== "app");
  const useMarketingShell = useLandingHeader || useMarketingFooter;

  return (
    <LandingProvider>
      <div>
        <div
          className={`main-wrap${
            isHomeLanding || useLandingHeader ? " landing-layout" : ""
          }${useMarketingShell ? " simba-marketing-layout" : ""}`}
        >
          {useLandingHeader ? (
            <LandingGuestHeader />
          ) : (
            <Header isGuestLanding={isGuest && isHomeLanding} />
          )}
          {children}
          {useMarketingFooter ? <SimbaMarketingFooter /> : <Footer />}
        </div>
      </div>
    </LandingProvider>
  );
}
