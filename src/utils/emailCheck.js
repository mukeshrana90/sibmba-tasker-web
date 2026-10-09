import Api from "../Services/api";

/** Same shape the backend accepts (allows "+" tags and long TLDs). */
export const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+-]{1,64}(?<!\.)@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

/**
 * Ask the server whether an email is genuine (deliverable domain, not a
 * typo like gmail.comcom). Resolves { ok, message?, suggestion? }; on a
 * network error it resolves ok so sign-up is never blocked by the check.
 */
export async function checkEmailRemote(email) {
  try {
    const res = await Api.post("/user/check-email", { email }, { skipAuth: true, skipAuthRedirect: true });
    return res?.data?.data || { ok: true };
  } catch {
    return { ok: true };
  }
}
