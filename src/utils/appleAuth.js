import { signInWithPopup } from "firebase/auth";
import { auth, appleProvider } from "./fireBaseConfig";

export async function getAppleIdToken() {
  const result = await signInWithPopup(auth, appleProvider);
  return result.user.getIdToken();
}
