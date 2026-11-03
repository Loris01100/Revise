-- Dessins des cartes : formes en JSON ([{ t, p }] sur une grille 600 × 400), référencés par ![dessin](id)
CREATE TABLE drawings (
  id          TEXT PRIMARY KEY,
  shapes      TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
