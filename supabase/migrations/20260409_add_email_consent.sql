-- Migration : ajout du consentement email RGPD dans admin_settings
-- Base légale : consentement explicite Art. 6.1.a RGPD
-- Partie 2.2 de la checklist RGPD/CNIL Erudia

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS consent_email      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_email_date TIMESTAMPTZ;

-- Si le consentement est retiré (consent_email = false), l'email doit être effacé.
-- Cette logique est gérée côté applicatif (AdminEmailSection.tsx).
