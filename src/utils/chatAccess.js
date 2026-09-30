import { getActiveModule } from "./Roles";

function resolvedModule(activeModule) {
  return activeModule || getActiveModule() || "tasker";
}

/** Role 4 owner/operator while Logistics module is active. */
export function isLogisticsSupplyRole({ role, activeModule } = {}) {
  return Number(role) === 4 && resolvedModule(activeModule) === "logistics";
}

/**
 * Who may start a new conversation from quotes / deep links.
 * Only hub customers (or role 4 in Tasker customer mode). Logistics supply never starts.
 */
export function canStartQuoteChat({ role, activeModule } = {}) {
  const r = Number(role);
  const mod = resolvedModule(activeModule);
  if (isLogisticsSupplyRole({ role: r, activeModule: mod })) return false;
  if (r === 1 || r === 2 || r === 3) return true;
  if (r === 4 && mod !== "logistics") return true;
  return false;
}

/**
 * Who may send messages in an open thread.
 * - Role 1 customers: always
 * - Role 2/3 in Logistics hub: act as customers → always
 * - Role 2/3 in Tasker as providers: need isSubscribed
 * - Role 4 in Tasker module (customer mode): always
 * - Role 4 in Logistics supply: need fleet owner paid plan (operators inherit;
 *   isSubscribed on /logistics/me is already the effective owner flag)
 */
export function canInitiateLogisticsOrTaskerChat({
  role,
  isSubscribed,
  activeModule,
} = {}) {
  const r = Number(role);
  const sub = Number(isSubscribed) === 1 || isSubscribed === true;
  const mod = resolvedModule(activeModule);
  const inLogistics = mod === "logistics";

  if (r === 1) return true;
  if (r === 2 || r === 3) return inLogistics || sub;
  if (r === 4) return !inLogistics || sub;
  return false;
}

/** True when role-4 supply needs the fleet owner's paid plan to reply. */
export function logisticsSupplyNeedsSubscription({ role, isSubscribed, activeModule } = {}) {
  const r = Number(role);
  const sub = Number(isSubscribed) === 1 || isSubscribed === true;
  const mod = resolvedModule(activeModule);
  return r === 4 && mod === "logistics" && !sub;
}

export function logisticsSubscriptionHeldByOwner() {
  return localStorage.getItem("logisticsSubscriptionHolder") === "owner";
}
