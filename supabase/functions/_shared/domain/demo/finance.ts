export const ensureDemoFinancialReadiness = async (
  _admin: any,
  _organizationId: string,
) => {
  return {
    organization_wallet_balance: 0,
    platform_wallet_balance: 0,
    settlement_mode: "simulated",
    financial_ready: true,
  };
};
