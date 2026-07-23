export function getAppHomePath() {
  const role = localStorage.getItem("role");
  if (String(role) === "3") return "/corporate";
  if (String(role) === "2") {
    try {
      if (sessionStorage.getItem("sp_has_service") === "0") {
        return "/service/add";
      }
    } catch {
      /* ignore */
    }
    return "/requests";
  }
  return "/";
}
