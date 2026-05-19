const nowIso = () => new Date().toISOString();

export const DEMO_ORG_WALLET_TARGET_BALANCE = 25000;
export const DEMO_PLATFORM_WALLET_MIN_BALANCE = 100000;

export const ensureDemoFinancialReadiness = async (
  admin: any,
  organizationId: string,
) => {
  const { error: orgUpdateError } = await admin
    .from("organizations")
    .update({
      ivisit_fee_percentage: 2.5,
      is_active: true,
      updated_at: nowIso(),
    })
    .eq("id", organizationId);

  if (orgUpdateError) {
    throw new Error(
      `organization finance sync failed: ${orgUpdateError.message}`,
    );
  }

  const { data: orgWallet, error: orgWalletError } = await admin
    .from("organization_wallets")
    .upsert(
      {
        organization_id: organizationId,
        balance: DEMO_ORG_WALLET_TARGET_BALANCE,
        currency: "USD",
        updated_at: nowIso(),
      },
      { onConflict: "organization_id", ignoreDuplicates: false },
    )
    .select("id,balance,currency")
    .single();

  if (orgWalletError) {
    throw new Error(
      `organization wallet sync failed: ${orgWalletError.message}`,
    );
  }

  const { data: platformWallet, error: platformLookupError } = await admin
    .from("ivisit_main_wallet")
    .select("id,balance,currency")
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (platformLookupError) {
    throw new Error(
      `platform wallet lookup failed: ${platformLookupError.message}`,
    );
  }

  let resolvedPlatformWallet = platformWallet;
  if (!resolvedPlatformWallet?.id) {
    const { data: createdPlatformWallet, error: createPlatformWalletError } =
      await admin
        .from("ivisit_main_wallet")
        .insert({
          balance: DEMO_PLATFORM_WALLET_MIN_BALANCE,
          currency: "USD",
          last_updated: nowIso(),
        })
        .select("id,balance,currency")
        .single();

    if (createPlatformWalletError) {
      throw new Error(
        `platform wallet create failed: ${createPlatformWalletError.message}`,
      );
    }

    resolvedPlatformWallet = createdPlatformWallet;
  } else {
    const currentPlatformBalance = Number(resolvedPlatformWallet.balance || 0);
    if (currentPlatformBalance < DEMO_PLATFORM_WALLET_MIN_BALANCE) {
      const { data: updatedPlatformWallet, error: updatePlatformWalletError } =
        await admin
          .from("ivisit_main_wallet")
          .update({
            balance: DEMO_PLATFORM_WALLET_MIN_BALANCE,
            last_updated: nowIso(),
          })
          .eq("id", resolvedPlatformWallet.id)
          .select("id,balance,currency")
          .single();

      if (updatePlatformWalletError) {
        throw new Error(
          `platform wallet top-up failed: ${updatePlatformWalletError.message}`,
        );
      }

      resolvedPlatformWallet = updatedPlatformWallet;
    }
  }

  return {
    organization_wallet_balance: Number(orgWallet?.balance || 0),
    platform_wallet_balance: Number(resolvedPlatformWallet?.balance || 0),
    fee_percentage: 2.5,
    financial_ready: true,
  };
};
