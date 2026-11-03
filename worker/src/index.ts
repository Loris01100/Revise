import { Hono } from "hono";
import { requireOwner } from "./auth";
import "./core";

export interface Env {
  DB: D1Database;
  CLAUDE_MODEL: string;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  OWNER_EMAIL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", requireOwner);

app.get("/api/subjects", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, color, created_at FROM subjects ORDER BY name",
  ).all();
  return c.json(results);
});

app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default app;
