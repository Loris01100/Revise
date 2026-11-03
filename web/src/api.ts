import { createSignal } from "solid-js";

export type Color = "yellow" | "pink" | "green" | "blue" | "orange";
export type Subject = { id: string; name: string; color: Color | null; cards: number; due: number; next_due: string | null };
export type CardType = "qa" | "cloze" | "mcq" | "explain";
export type Card = {
  id: string;
  subject_id: string;
  type: CardType;
  question: string;
  answer: string;
  choices: string[] | null;
  explanation: string | null;
  source_page?: number | null;
  status?: "draft" | "active" | "suspended";
};
export type Parked = { id: string; text: string; session_id: string | null };

export class Offline extends Error {}
export class Expired extends Error {}
export class Failed extends Error {
  constructor(
    readonly status: number,
    readonly body?: any,
  ) {
    super(String(status));
  }
}

/** Accès Cloudflare expiré : Access répond par une redirection vers sa page de connexion. */
export const [expired, setExpired] = createSignal(false);

// `keepalive` : la requête survit à la fermeture de l'onglet (corps limité à 64 Ko)
export async function api<T = void>(method: string, path: string, body?: unknown, keepalive?: boolean): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      keepalive,
    });
  } catch {
    throw new Offline();
  }
  if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) {
    setExpired(true);
    throw new Expired();
  }
  if (!res.ok) throw new Failed(res.status, await res.json().catch(() => null));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// File d'envoi gardée sur l'appareil : notes, pensées, clôtures. Envoyée dans l'ordre.
// `hold` : la dernière note reste corrigeable jusqu'à la note suivante ; un rechargement la libère.
type Job = { id: string; method: string; path: string; body: unknown; hold?: boolean };
const KEY = "revise.queue";
const stored: Job[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
const [jobs, setJobs] = createSignal<Job[]>(stored.map((j) => ({ ...j, hold: false })));
/** Un envoi a échoué et des éléments attendent. */
export const [stalled, setStalled] = createSignal(false);
export const waitingReviews = () => jobs().filter((j) => j.path.endsWith("/reviews")).length;

function save(next: Job[]) {
  localStorage.setItem(KEY, JSON.stringify(next));
  setJobs(next);
}

export function enqueue(job: Omit<Job, "id"> & { id?: string }) {
  const j = { ...job, id: job.id ?? crypto.randomUUID() };
  const list = jobs();
  const i = list.findIndex((x) => x.id === j.id);
  save(i < 0 ? [...list, j] : list.map((x, k) => (k === i ? j : x)));
  if (!j.hold) void flush();
}

export function release() {
  if (jobs().some((j) => j.hold)) save(jobs().map((j) => ({ ...j, hold: false })));
  return flush();
}

let running: Promise<void> | null = null;
// `.finally` passe après l'affectation, même quand la file est vide et que l'envoi finit sans attendre
export const flush = (): Promise<void> => (running ??= send().finally(() => (running = null)));

async function send() {
  for (let j: Job | undefined; (j = jobs().find((x) => !x.hold)); ) {
    const id = j.id;
    try {
      await api(j.method, j.path, j.body);
    } catch (e) {
      // 4xx (carte supprimée entre-temps…) : on abandonne l'élément ; le reste attend le réseau
      if (!(e instanceof Failed) || e.status >= 500) return void setStalled(true);
    }
    save(jobs().filter((x) => x.id !== id));
  }
  setStalled(false);
}

setInterval(() => jobs().length && !expired() && flush(), 10_000);
addEventListener("online", () => void flush());
void flush();
