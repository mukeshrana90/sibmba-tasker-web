import { createContext, useCallback, useContext, useMemo, useState } from "react";

const LogisticsSupplyChromeContext = createContext(null);

export function LogisticsSupplyChromeProvider({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const value = useMemo(
    () => ({ mobileOpen, setMobileOpen, closeMobile, toggleMobile }),
    [mobileOpen, closeMobile, toggleMobile]
  );
  return (
    <LogisticsSupplyChromeContext.Provider value={value}>
      {children}
    </LogisticsSupplyChromeContext.Provider>
  );
}

export function useLogisticsSupplyChrome() {
  return useContext(LogisticsSupplyChromeContext);
}

export function isLogisticsSupplyChromePath(pathname = "") {
  return (
    pathname.startsWith("/logistics/owner") ||
    pathname.startsWith("/logistics/driver")
  );
}
