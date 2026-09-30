export const Roles = {
    CUSTOMER: 1,
    SERVICE_PROVIDER: 2,
    CORPORATE: 3,
    LOGISTICS: 4,
};

export function normalizeRole(value) {
    const role = Number(value);
    if (
        role === Roles.CUSTOMER ||
        role === Roles.SERVICE_PROVIDER ||
        role === Roles.CORPORATE ||
        role === Roles.LOGISTICS
    ) {
        return role;
    }
    return null;
}

export function isCorporateRole(value) {
    return normalizeRole(value) === Roles.CORPORATE;
}

export function isServiceProviderRole(value) {
    return normalizeRole(value) === Roles.SERVICE_PROVIDER;
}

export function isLogisticsRole(value) {
    return normalizeRole(value) === Roles.LOGISTICS;
}

export function isLogisticsOwner(role, ownerId) {
    return isLogisticsRole(role) && !ownerId;
}

export function isLogisticsDriver(role, ownerId) {
    return isLogisticsRole(role) && Boolean(ownerId);
}

export function canHubConsume(role, permissions = []) {
    const r = normalizeRole(role);
    if (r === Roles.CUSTOMER || r === Roles.SERVICE_PROVIDER || r === Roles.CORPORATE) {
        return true;
    }
    if (r === Roles.LOGISTICS) {
        return Array.isArray(permissions) && permissions.includes("hub.consume");
    }
    return false;
}

export function homeRouteForRole(role, ownerId) {
    const r = normalizeRole(role);
    if (r === Roles.CUSTOMER) return "/";
    if (r === Roles.SERVICE_PROVIDER) return "/requests";
    if (r === Roles.CORPORATE) return "/corporate";
    if (r === Roles.LOGISTICS) {
        return ownerId ? "/logistics/driver" : "/logistics/owner";
    }
    return "/";
}

export const ACTIVE_MODULE_KEY = "activeModule";

export function getActiveModule() {
    const v = localStorage.getItem(ACTIVE_MODULE_KEY);
    return v === "logistics" ? "logistics" : "tasker";
}

export function setActiveModule(module) {
    const next = module === "logistics" ? "logistics" : "tasker";
    localStorage.setItem(ACTIVE_MODULE_KEY, next);
    return next;
}

/** Shared chrome routes keep the last module (so Messages does not flip Logistics menus). */
export const SHARED_MODULE_PATH_PREFIXES = [
    "/messages",
    "/profile",
    "/edit-profile",
    "/edit-profile-company",
    "/change-password",
    "/my-subscription",
    "/notifications",
];

export function isSharedModulePath(pathname = "") {
    return SHARED_MODULE_PATH_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
}

/**
 * Which product menus to show in the app header.
 * /logistics* → logistics; shared pages → stored module; everything else → tasker.
 */
export function resolveActiveModule(pathname = "") {
    if (pathname.startsWith("/logistics")) return "logistics";
    if (isSharedModulePath(pathname)) return getActiveModule();
    return "tasker";
}

/** Persist module from route (call from nav effects). */
export function syncActiveModuleFromPath(pathname = "") {
    if (pathname.startsWith("/logistics")) return setActiveModule("logistics");
    if (isSharedModulePath(pathname)) return getActiveModule();
    return setActiveModule("tasker");
}

export const corpoTaskStatus = {
    PENDING: 0,// task not accept or reject by corpo
    ACCEPT: 1, // task accepted by corpo
    REJECT: 2, // task reject by corop
    COMPLETED: 3,
}

export const corpoTaskStatusStr = {
    PENDING: 'pending',// task not accept or reject by corpo
    INPROGESS: 'in-progress', // task accepted by corpo
    REJECT: 'rejected',
    COMPLETED: 'completed' // task reject by corop
}
