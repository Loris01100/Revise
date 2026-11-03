import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { App } from "./index";

// Clés publiques mises en cache par isolate ; jose les recharge à la rotation
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

// Qui entre : la policy Access (seule liste des invités). Ici : JWT vérifié, puis l'e-mail identifie la personne.
export const requireUser = createMiddleware<App>(async (c, next) => {
  const { TEAM_DOMAIN, POLICY_AUD } = c.env;
  // Config incomplète : on refuse tout plutôt que d'ouvrir
  if (!TEAM_DOMAIN || !POLICY_AUD) return c.json({ error: "config" }, 500);

  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) return c.json({ error: "unauthenticated" }, 401);

  jwks ??= createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: TEAM_DOMAIN,
      audience: POLICY_AUD,
      algorithms: ["RS256"],
    });
    if (typeof payload.email !== "string" || !payload.email) return c.json({ error: "forbidden" }, 403);
    c.set("user", payload.email.toLowerCase());
  } catch {
    return c.json({ error: "unauthenticated" }, 401);
  }
  await next();
});
