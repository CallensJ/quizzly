/**
 * src/app/api/stripe/checkout/route.ts
 *
 * Crée une session Stripe Checkout pour un abonnement mensuel ou annuel.
 * L'utilisateur doit être authentifié — le JWT est lu depuis le header Authorization.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Instanciation à l'intérieur du handler — les env vars runtime ne sont pas
  // disponibles au niveau module lors du build Next.js
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });

  // Client anon — vérifie le JWT entrant
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Client admin — lit la table subscriptions pour récupérer le stripe_customer_id existant
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    // 1. Vérifie le JWT depuis le header Authorization: Bearer <token>
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Récupère l'interval choisi (monthly ou yearly)
    const { interval } = await req.json();
    const priceId =
      interval === "yearly"
        ? process.env.STRIPE_PRICE_YEARLY!
        : process.env.STRIPE_PRICE_MONTHLY!;

    // 3. Réutilise le stripe_customer_id existant si l'utilisateur a déjà souscrit
    //    → évite la création de clients en double dans Stripe
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerParam = existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: user.email };

    // 4. Crée la session Checkout Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...customerParam,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/cancel`,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
