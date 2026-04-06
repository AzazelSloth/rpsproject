-- Ajouter le mode démo au compte Admin@laroche360.ca
-- Mot de passe: password
-- Hash bcrypt généré pour 'password': $2b$10$pU36V2iHXVgSJgZd8lnOsuZtk/T0VpTkJA5Q0ywb9UK7.29Mrve.W

-- 1. Ajouter la colonne is_demo
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- 2. Insérer ou mettre à jour le compte démo
INSERT INTO users (name, email, password, is_demo)
VALUES ('Admin Demo', 'Admin@laroche360.ca', '$2b$10$pU36V2iHXVgSJgZd8lnOsuZtk/T0VpTkJA5Q0ywb9UK7.29Mrve.W', TRUE)
ON CONFLICT (email) 
DO UPDATE SET is_demo = TRUE, 
              password = '$2b$10$pU36V2iHXVgSJgZd8lnOsuZtk/T0VpTkJA5Q0ywb9UK7.29Mrve.W';
