-- Dernière réécriture du contenu d'une carte : les « À revoir » d'avant ne comptent plus pour la repérer comme coincée
ALTER TABLE cards ADD COLUMN edited_at TEXT;
