/**
 * src/components/features/auth/__tests__/AuthProvider.test.ts
 *
 * Tests unitaires de `resolveAccess()` (cahier-des-charges-claude-v1.4.md §5).
 *
 * Ce qu'on teste :
 *   - abonnement Stripe actif/trialing → premium (prioritaire sur le trial)
 *   - essai gratuit (account_trials) encore valide → trial, avec trialEndsAt
 *   - essai gratuit expiré, pas d'abonnement → expired
 *   - aucune ligne dans subscriptions ni account_trials → expired
 *   - abonnement inactif + essai encore valide → trial (le 2e chemin d'accès s'applique)
 *   - erreur DB sur l'une des deux requêtes → null (laisse l'appelant retenter)
 *
 * Supabase est mocké — on isole la logique pure de résolution d'accès.
 */

const mockSubscriptionsMaybeSingle = jest.fn();
const mockTrialsMaybeSingle = jest.fn();

jest.mock('@/lib/supabaseBrowser', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle:
            table === 'subscriptions' ? mockSubscriptionsMaybeSingle : mockTrialsMaybeSingle,
        }),
      }),
    }),
  },
}));

import { resolveAccess } from '../AuthProvider';

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('resolveAccess', () => {
  it('retourne premium si l\'abonnement est actif, même avec un essai encore valide', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: { status: 'active' }, error: null });
    mockTrialsMaybeSingle.mockResolvedValue({ data: { trial_ends_at: inDays(3) }, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: true, accessStatus: 'premium', trialEndsAt: null });
  });

  it('retourne premium si l\'abonnement est en trialing (Stripe)', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: { status: 'trialing' }, error: null });
    mockTrialsMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: true, accessStatus: 'premium', trialEndsAt: null });
  });

  it('retourne trial si aucun abonnement mais un essai gratuit encore valide', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: null });
    const trialEndsAt = inDays(5);
    mockTrialsMaybeSingle.mockResolvedValue({ data: { trial_ends_at: trialEndsAt }, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: true, accessStatus: 'trial', trialEndsAt });
  });

  it('retourne trial si l\'abonnement est inactif mais l\'essai est encore valide (2e chemin d\'accès)', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: { status: 'canceled' }, error: null });
    const trialEndsAt = inDays(1);
    mockTrialsMaybeSingle.mockResolvedValue({ data: { trial_ends_at: trialEndsAt }, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: true, accessStatus: 'trial', trialEndsAt });
  });

  it('retourne expired si l\'essai est expiré et qu\'il n\'y a pas d\'abonnement actif', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockTrialsMaybeSingle.mockResolvedValue({ data: { trial_ends_at: inDays(-1) }, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: false, accessStatus: 'expired', trialEndsAt: null });
  });

  it('retourne expired si aucune ligne subscriptions ni account_trials n\'existe', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockTrialsMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toEqual({ isPremium: false, accessStatus: 'expired', trialEndsAt: null });
  });

  it('retourne null si la requête subscriptions échoue (laisse l\'appelant retenter)', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });
    mockTrialsMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await resolveAccess('user-1');

    expect(result).toBeNull();
  });

  it('retourne null si la requête account_trials échoue (laisse l\'appelant retenter)', async () => {
    mockSubscriptionsMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockTrialsMaybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });

    const result = await resolveAccess('user-1');

    expect(result).toBeNull();
  });
});
