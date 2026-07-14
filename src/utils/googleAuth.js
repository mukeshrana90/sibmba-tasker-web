import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./fireBaseConfig";

googleProvider.setCustomParameters({ prompt: "select_account" });

export async function getGoogleIdToken() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user.getIdToken();
}
