export function getAppHomePath() {
  const role = localStorage.getItem("role");
  if (String(role) === "3") return "/corporate";
  if (String(role) === "2") return "/requests";
  return "/";
}
