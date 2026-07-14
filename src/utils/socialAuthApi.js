export function socialLoginPathForRole(role) {
  const normalizedRole = Number(role);
  if (normalizedRole === 2) return "/service/auth/socialLogin";
  if (normalizedRole === 3) return "/corporate/auth/socialLogin";
  return "/customer/auth/socialLogin";
}

export const SOCIAL_TYPE = {
  GOOGLE: 1,
  APPLE: 2,
};
