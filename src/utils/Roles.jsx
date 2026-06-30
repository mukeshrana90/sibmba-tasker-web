export const Roles = {
    CUSTOMER: 1,
    SERVICE_PROVIDER: 2,
    CORPORATE: 3,
};

export function normalizeRole(value) {
    const role = Number(value);
    if (
        role === Roles.CUSTOMER ||
        role === Roles.SERVICE_PROVIDER ||
        role === Roles.CORPORATE
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