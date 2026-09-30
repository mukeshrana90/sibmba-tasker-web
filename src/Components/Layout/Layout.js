import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "./Header";
import Footer from "./Footer";
import LandingGuestHeader from "../../CommanComponents/Landing/LandingGuestHeader";
import SimbaMarketingFooter from "./SimbaMarketingFooter";
import { LandingProvider } from "../../context/LandingContext";
import {
  Roles,
  getActiveModule,
  isSharedModulePath,
} from "../../utils/Roles";
import { isServiceProviderPortalPath } from "../../utils/serviceProviderPaths";
import LogisticsSupplySidebar from "./LogisticsSupplySidebar";
import {
  LogisticsSupplyChromeProvider,
  isLogisticsSupplyChromePath,
} from "./LogisticsSupplyChromeContext";
import "../../Assets/css/landing.css";
import "../../Pages/logistics/logistics.css";

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
  const isLogisticsArea = location.pathname.startsWith("/logistics");
  const isAppMarketingArea =
    ((isCorporateUser || isServiceProvider) &&
      APP_MARKETING_PATHS.includes(location.pathname)) ||
    isLogisticsArea;
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

  const isDriver = Boolean(localStorage.getItem("owner_id"));
  const { customerDetails } = useSelector((state) => state.login);
  const showSupplySidebar = useMemo(() => {
    if (Number(role) !== Roles.LOGISTICS || !token) return false;
    if (isLogisticsSupplyChromePath(location.pathname)) return true;
    return (
      isSharedModulePath(location.pathname) && getActiveModule() === "logistics"
    );
  }, [role, token, location.pathname]);

  return (
    <LandingProvider>
      <div>
        <div
          className={`main-wrap${
            isHomeLanding || useLandingHeader ? " landing-layout" : ""
          }${useMarketingShell ? " simba-marketing-layout" : ""}${
            showSupplySidebar ? " log-supply-layout" : ""
          }`}
        >
          {showSupplySidebar ? (
            <LogisticsSupplyChromeProvider>
              <Header isGuestLanding={isGuest && isHomeLanding} />
              <div className="log-supply-shell">
                <LogisticsSupplySidebar
                  isDriver={isDriver}
                  customerDetails={customerDetails}
                />
                <div className="log-supply-main">{children}</div>
              </div>
              {useMarketingFooter && !showSupplySidebar ? (
                <SimbaMarketingFooter />
              ) : !showSupplySidebar ? (
                <Footer />
              ) : null}
            </LogisticsSupplyChromeProvider>
          ) : (
            <>
              {useLandingHeader ? (
                <LandingGuestHeader />
              ) : (
                <Header isGuestLanding={isGuest && isHomeLanding} />
              )}
              {children}
              {useMarketingFooter ? <SimbaMarketingFooter /> : <Footer />}
            </>
          )}
        </div>
      </div>
    </LandingProvider>
  );
}
