'use client';

/**
 * src/components/features/admin/PinModal.tsx
 *
 * Modal de saisie du PIN parent (4 chiffres).
 * Utilisé en deux modes :
 *   - 'create' : premier accès, définit le PIN (pas de vérification)
 *   - 'verify' : accès suivants, compare la saisie avec le PIN stocké
 *
 * UX : 4 inputs individuels (un chiffre par case) avec focus auto-avançant.
 * Accessibilité : focus piégé dans la modal, rôle dialog.
 */

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

interface PinModalProps {
  mode: 'create' | 'verify';
  storedPin?: string | null;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export default function PinModal({ mode, storedPin, onSuccess, onCancel }: PinModalProps) {
  const t = useTranslations('admin');

  // 4 chiffres stockés dans un tableau pour un contrôle précis par case
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus automatique sur la première case à l'ouverture
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(index: number, value: string) {
    // N'accepte qu'un chiffre
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(false);

    // Avance automatiquement au champ suivant si un chiffre est saisi
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    // Backspace sur une case vide → recule au champ précédent
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    // Ferme la modal sur Escape
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  // Gestion du coller — répartit les 4 premiers chiffres dans les cases
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    // Focus sur la dernière case remplie ou la suivante
    const focusIndex = Math.min(pasted.length, 3);
    inputRefs[focusIndex].current?.focus();
  }

  function handleConfirm() {
    const pin = digits.join('');
    if (pin.length < 4) return;

    if (mode === 'verify') {
      if (pin !== storedPin) {
        setError(true);
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
        return;
      }
    }

    onSuccess(pin);
  }

  const pinComplete = digits.every((d) => d !== '');
  const title = mode === 'create' ? t('pinModalCreateTitle') : t('pinModalVerifyTitle');
  const desc  = mode === 'create' ? t('pinModalCreateDesc')  : t('pinModalVerifyDesc');

  return (
    // Overlay sombre — clic sur le fond annule
    <div
      className="pin-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="pin-modal">
        {/* Icône cadenas */}
        <div className="pin-modal__icon" aria-hidden="true">
          <Lock size={28} strokeWidth={2} />
        </div>

        <h2 id="pin-modal-title" className="pin-modal__title">{title}</h2>
        <p className="pin-modal__desc">{desc}</p>

        {/* 4 cases de saisie */}
        <div className="pin-modal__inputs" role="group" aria-label="Code PIN">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              className={`pin-modal__input${error ? ' pin-modal__input--error' : ''}`}
              aria-label={`Chiffre ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoComplete="off"
            />
          ))}
        </div>

        {/* Message d'erreur (mode verify uniquement) */}
        {error && (
          <p className="pin-modal__error" role="alert">{t('pinModalError')}</p>
        )}

        {/* Actions */}
        <div className="pin-modal__actions">
          <button
            type="button"
            className="pin-modal__btn pin-modal__btn--cancel"
            onClick={onCancel}
          >
            {t('pinModalCancel')}
          </button>
          <button
            type="button"
            className="pin-modal__btn pin-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!pinComplete}
          >
            {t('pinModalConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
