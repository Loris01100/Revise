-- Contenu partagé (matières, cartes, dessins), progression propre à chaque personne.
-- user_id = e-mail Access en minuscules ; l'existant revient au propriétaire.

CREATE TABLE card_state_new (
  user_id      TEXT NOT NULL,
  card_id      TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  due          TEXT NOT NULL,
  stability    REAL NOT NULL,
  difficulty   REAL NOT NULL,
  reps         INTEGER NOT NULL DEFAULT 0,
  lapses       INTEGER NOT NULL DEFAULT 0,
  state        TEXT NOT NULL CHECK (state IN ('new','learning','review','relearning')),
  last_review  TEXT,
  PRIMARY KEY (user_id, card_id)
);
INSERT INTO card_state_new
  SELECT 'lolobach01100@gmail.com', card_id, due, stability, difficulty, reps, lapses, state, last_review FROM card_state;
DROP TABLE card_state;
ALTER TABLE card_state_new RENAME TO card_state;
CREATE INDEX idx_card_state_due ON card_state(user_id, due);

ALTER TABLE reviews ADD COLUMN user_id TEXT;
ALTER TABLE sessions ADD COLUMN user_id TEXT;
ALTER TABLE parked_thoughts ADD COLUMN user_id TEXT;
UPDATE reviews SET user_id = 'lolobach01100@gmail.com';
UPDATE sessions SET user_id = 'lolobach01100@gmail.com';
UPDATE parked_thoughts SET user_id = 'lolobach01100@gmail.com';
CREATE INDEX idx_reviews_user ON reviews(user_id, card_id);
