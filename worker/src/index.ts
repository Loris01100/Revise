import { Hono } from "hono";
import { requireOwner } from "./auth";
import api from "./routes";

export interface Env {
  DB: D1Database;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  OWNER_EMAIL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", requireOwner);

app.route("/api", api);
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default app;
