/**
 * Stripe env reader — fail-closed. Never log raw secrets.
 * Server-only.
 */

export type StripeEnv = {
  secretKey: string;
  webhookSecret: string;
  pricePro: string;
  publishableKey: string | null;
  appUrl: string;
};

export type StripeEnvStatus = {
  configured: boolean;
  secretKeyPresent: boolean;
  webhookSecretPresent: boolean;
  priceProPresent: boolean;
  publishableKeyPresent: boolean;
  missing: string[];
};

export function readStripeEnvStatus(): StripeEnvStatus {
  const secretKeyPresent = Boolean((process.env.STRIPE_SECRET_KEY ?? "").trim());
  const webhookSecretPresent = Boolean((process.env.STRIPE_WEBHOOK_SECRET ?? "").trim());
  const priceProPresent = Boolean((process.env.STRIPE_PRICE_PRO ?? "").trim());
  const publishableKeyPresent = Boolean((process.env.STRIPE_PUBLISHABLE_KEY ?? "").trim());
  const missing: string[] = [];
  if (!secretKeyPresent) missing.push("STRIPE_SECRET_KEY");
  if (!webhookSecretPresent) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!priceProPresent) missing.push("STRIPE_PRICE_PRO");
  return {
    configured: missing.length === 0,
    secretKeyPresent,
    webhookSecretPresent,
    priceProPresent,
    publishableKeyPresent,
    missing,
  };
}

/** Throws if checkout/webhook cannot run. */
export function requireStripeEnv(): StripeEnv {
  const secretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const pricePro = (process.env.STRIPE_PRICE_PRO ?? "").trim();
  const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY ?? "").trim() || null;
  const appUrl = (
    process.env.APP_URL ??
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_APP_URL ??
    "https://cosy-app-kit.vercel.app"
  )
    .trim()
    .replace(/\/$/, "");

  const missing: string[] = [];
  if (!secretKey) missing.push("STRIPE_SECRET_KEY");
  if (!webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!pricePro) missing.push("STRIPE_PRICE_PRO");
  if (missing.length) {
    throw new Error(`Stripe not configured (missing ${missing.join(", ")})`);
  }

  return { secretKey, webhookSecret, pricePro, publishableKey, appUrl };
}
