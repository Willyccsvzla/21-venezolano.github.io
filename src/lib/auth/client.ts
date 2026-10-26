import { createAuthClient } from "better-auth/react";
import { runSignOut } from "../../../scripts/sign-out-plan.mjs";
import { GOOGLE_PROVIDERS } from "./providers";

/** Same-origin Better Auth client; Google OAuth is configured server-side. */
export const authClient = createAuthClient();

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
export { GOOGLE_PROVIDERS };

/** No bearer token is needed for the deployed same-origin cookie session. */
export function getBearerToken(): string | null {
  return null;
}

export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  if (providerId !== "google") throw new Error("Proveedor de acceso no compatible.");
  const { error: signOutError } = await authClient.signOut();
  if (signOutError) throw new Error(signOutError.message ?? "No se pudo cerrar la sesión anterior.");
  const { data, error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: opts.callbackURL ?? "/",
    errorCallbackURL: opts.errorCallbackURL ?? "/",
  });
  if (error) throw new Error(error.message ?? "No se pudo iniciar sesión con Google.");
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }
  throw new Error("Google no devolvió la dirección de autenticación.");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    livePreview: false,
    hasBearer: false,
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    clearToken: () => undefined,
    redirect: () => { window.location.href = redirectTo; },
  });
}
