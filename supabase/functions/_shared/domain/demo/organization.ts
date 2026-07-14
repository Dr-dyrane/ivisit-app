import {
  resolveDemoSeedScopeKey,
  type DemoContext,
} from "./context.ts";

const nowIso = () => new Date().toISOString();

export const ensureDemoOrganization = async (
  admin: any,
  ctx: DemoContext,
) => {
  const scopeKey = resolveDemoSeedScopeKey(ctx);
  const contactEmail = `demo+coverage-${scopeKey}@ivisit-demo.local`;

  const { data: existing, error: existingError } = await admin
    .from("organizations")
    .select("id,name,contact_email")
    .eq("contact_email", contactEmail)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`organization lookup failed: ${existingError.message}`);
  }

  if (existing?.id) {
    const { data: refreshed, error: refreshError } = await admin
      .from("organizations")
      .update({
        organization_type: "hospital",
        verification_status: "verified",
        is_active: true,
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .select("id,name,contact_email")
      .single();

    if (refreshError) {
      throw new Error(`organization refresh failed: ${refreshError.message}`);
    }

    return { organization: refreshed, created: false };
  }

  const payload = {
    name: `iVisit Coverage Network ${scopeKey.toUpperCase()}`,
    contact_email: contactEmail,
    fee_tier: "standard",
    ivisit_fee_percentage: 2.5,
    organization_type: "hospital",
    verification_status: "verified",
    is_active: true,
    updated_at: nowIso(),
  };

  const { data: created, error: createError } = await admin
    .from("organizations")
    .insert(payload)
    .select("id,name,contact_email")
    .single();

  if (createError) {
    throw new Error(`organization create failed: ${createError.message}`);
  }

  return { organization: created, created: true };
};
