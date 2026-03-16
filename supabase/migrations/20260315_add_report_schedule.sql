-- Migration : ajout des colonnes de planification des rapports PDF dans admin_settings
-- Ces colonnes permettent au parent de configurer l'envoi automatique du rapport de progression
-- (hebdomadaire ou mensuel) vers son adresse email.

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS report_schedule TEXT NOT NULL DEFAULT 'none'
    CHECK (report_schedule IN ('none', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS report_last_sent TIMESTAMPTZ;

-- Index pour les crons qui cherchent les rapports à envoyer
CREATE INDEX IF NOT EXISTS idx_admin_settings_report_schedule
  ON admin_settings (report_schedule)
  WHERE report_schedule != 'none';
