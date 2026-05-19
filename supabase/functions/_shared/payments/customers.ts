import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

export const ensurePatientCustomerId = async ({
  supabaseAdmin,
  stripe,
  userId,
  userEmail,
}: {
  supabaseAdmin: any;
  stripe: Stripe;
  userId: string;
  userEmail?: string | null;
}) => {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email: userEmail || undefined,
    name: profile.full_name || userEmail || undefined,
    metadata: { user_id: userId },
  });

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Could not store Stripe customer: ${updateError.message}`);
  }

  return customer.id;
};
