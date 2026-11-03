-- Schéma initial : dates en ISO 8601 (texte), ids en UUID

CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE sources (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('pdf','docx')),
  r2_key      TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('processing','ready','failed')),
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  error       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE cards (
  id           TEXT PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  source_id    TEXT REFERENCES sources(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('qa','cloze','mcq','explain')),
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  choices      TEXT,             -- JSON pour les QCM
  explanation  TEXT,
  source_page  INTEGER,
  status       TEXT NOT NULL CHECK (status IN ('draft','active','suspended')),
  created_at   TEXT NOT NULL
);

CREATE TABLE card_state (        -- état FSRS, une ligne par carte active
  card_id      TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  due          TEXT NOT NULL,
  stability    REAL NOT NULL,
  difficulty   REAL NOT NULL,
  reps         INTEGER NOT NULL DEFAULT 0,
  lapses       INTEGER NOT NULL DEFAULT 0,
  state        TEXT NOT NULL CHECK (state IN ('new','learning','review','relearning')),
  last_review  TEXT
);
CREATE INDEX idx_card_state_due ON card_state(due);

CREATE TABLE reviews (           -- historique : stats et optimisation FSRS
  id           TEXT PRIMARY KEY,
  card_id      TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  session_id   TEXT REFERENCES sessions(id),
  grade        INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 4),
  duration_ms  INTEGER,
  reviewed_at  TEXT NOT NULL
);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  mode         TEXT NOT NULL CHECK (mode IN ('quick5','timed','subject')),
  planned_min  INTEGER,
  started_at   TEXT NOT NULL,
  ended_at     TEXT,
  cards_done   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE parked_thoughts (
  id          TEXT PRIMARY KEY,
  session_id  TEXT REFERENCES sessions(id),
  text        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
