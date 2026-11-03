import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "./index";

// Clés publiques mises en cache par isolate ; jose les recharge à la rotation
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export const requireOwner = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const { TEAM_DOMAIN, POLICY_AUD, OWNER_EMAIL } = c.env;
  // Config incomplète : on refuse tout plutôt que d'ouvrir
  if (!TEAM_DOMAIN || !POLICY_AUD || !OWNER_EMAIL) return c.json({ error: "config" }, 500);

  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) return c.json({ error: "unauthenticated" }, 401);

  jwks ??= createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: TEAM_DOMAIN,
      audience: POLICY_AUD,
      algorithms: ["RS256"],
    });
    if (String(payload.email).toLowerCase() !== OWNER_EMAIL.toLowerCase()) return c.json({ error: "forbidden" }, 403);
  } catch {
    return c.json({ error: "unauthenticated" }, 401);
  }
  await next();
});
