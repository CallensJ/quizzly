/**
 * src/app/[locale]/subscribe/success/page.tsx
 *
 * Page de confirmation après un paiement Stripe réussi.
 * Stripe redirige ici avec ?session_id=... après le checkout.
 */

import SubscribeSuccessScreen from '@/components/features/subscribe/SubscribeSuccessScreen';

export default function SubscribeSuccessPage() {
  return <SubscribeSuccessScreen />;
}
