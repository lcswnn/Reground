/**
 * Whether this person has paid for the extra games.
 *
 * A stub, and deliberately a hard-coded `false` rather than a half-built
 * purchase flow: the app has no account, no store client and no receipt to
 * check — the pivot took Supabase out with it — so there is currently no honest
 * way to answer this question. The picker is written against this hook rather
 * than against a literal so that wiring a real one up is a change to this file
 * and nowhere else.
 *
 * TODO: back this with a real entitlement (StoreKit / `expo-iap` or
 * RevenueCat), and give the locked cards somewhere to lead. Until then the
 * premium section is a statement of intent — it says what a purchase would buy
 * and cannot be tapped, which is the only version of it that isn't a lie.
 */
export function usePremiumAccess(): boolean {
  return false;
}
