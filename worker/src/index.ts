import { Hono } from "hono";
import { requireUser } from "./auth";
import api from "./routes";

export interface Env {
  DB: D1Database;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  ADMIN_EMAIL: string;
}

// user : e-mail Access en minuscules ; admin : user = ADMIN_EMAIL. Posés par requireUser
export type App = { Bindings: Env; Variables: { user: string; admin: boolean } };

const app = new Hono<App>();

app.use("/api/*", requireUser);

app.route("/api", api);
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default app;
