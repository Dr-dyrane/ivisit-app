import {
  ROOM_PRICING_BASELINES,
  SERVICE_PRICING_BASELINES,
} from "./pricing.ts";
import type { DemoContext } from "./context.ts";

const DEMO_MIN_HOSPITALS = 5;

const listDemoHospitals = async (
  admin: any,
  _ctx: DemoContext,
  organizationId: string,
) => {
  const { data, error } = await admin
    .from("hospitals")
    .select(
      "id,name,place_id,organization_id,latitude,longitude,features,verified,verification_status,status",
    )
    .eq("organization_id", organizationId)
    .like("place_id", "demo:%")
    .eq("status", "available")
    .order("place_id", { ascending: true });

  if (error) {
    throw new Error(`demo hospital lookup failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
};

export const getDemoSummary = async (
  admin: any,
  ctx: DemoContext,
  organizationId: string,
) => {
  const hospitals = await listDemoHospitals(admin, ctx, organizationId);
  const hospitalIds = hospitals.map((h) => h.id).filter(Boolean);

  let doctorsCount = 0;
  let ambulancesCount = 0;
  let servicePricingCount = 0;
  let roomPricingCount = 0;
  let orgWalletBalance = 0;
  let platformWalletBalance = 0;
  let orgFeePercentage = 0;

  if (hospitalIds.length > 0) {
    const { count: doctors, error: doctorsError } = await admin
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (doctorsError) {
      throw new Error(`summary doctors count failed: ${doctorsError.message}`);
    }
    doctorsCount = Number(doctors || 0);

    const { count: ambulances, error: ambulancesError } = await admin
      .from("ambulances")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (ambulancesError) {
      throw new Error(
        `summary ambulances count failed: ${ambulancesError.message}`,
      );
    }
    ambulancesCount = Number(ambulances || 0);

    const { count: servicePricing, error: servicePricingError } = await admin
      .from("service_pricing")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (servicePricingError) {
      throw new Error(
        `summary service pricing count failed: ${servicePricingError.message}`,
      );
    }
    servicePricingCount = Number(servicePricing || 0);

    const { count: roomPricing, error: roomPricingError } = await admin
      .from("room_pricing")
      .select("id", { count: "exact", head: true })
      .in("hospital_id", hospitalIds);
    if (roomPricingError) {
      throw new Error(
        `summary room pricing count failed: ${roomPricingError.message}`,
      );
    }
    roomPricingCount = Number(roomPricing || 0);
  }

  const { data: orgWallet } = await admin
    .from("organization_wallets")
    .select("balance")
    .eq("organization_id", organizationId)
    .maybeSingle();
  orgWalletBalance = Number(orgWallet?.balance || 0);

  const { data: platformWallet } = await admin
    .from("ivisit_main_wallet")
    .select("balance")
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();
  platformWalletBalance = Number(platformWallet?.balance || 0);

  const { data: organizationRow } = await admin
    .from("organizations")
    .select("ivisit_fee_percentage")
    .eq("id", organizationId)
    .maybeSingle();
  orgFeePercentage = Number(organizationRow?.ivisit_fee_percentage || 0);

  const hospitalsReady = hospitals.length >= DEMO_MIN_HOSPITALS;
  const staffingReady =
    hospitalsReady &&
    doctorsCount >= hospitals.length &&
    ambulancesCount >= hospitals.length;
  const pricingReady =
    hospitalsReady &&
    servicePricingCount >=
      hospitals.length * SERVICE_PRICING_BASELINES.length &&
    roomPricingCount >= hospitals.length * ROOM_PRICING_BASELINES.length;
  // Demo dispatch has simulated settlement. Never require or create shared
  // organization/platform funding merely to make the patient demo seamless.
  const financialReady = orgFeePercentage > 0;
  const dispatchReady = hospitalsReady && staffingReady && financialReady;
  const cleanCycleReady = dispatchReady && pricingReady;

  return {
    organization_id: organizationId,
    hospitals_count: hospitals.length,
    doctors_count: doctorsCount,
    ambulances_count: ambulancesCount,
    service_pricing_count: servicePricingCount,
    room_pricing_count: roomPricingCount,
    organization_wallet_balance: orgWalletBalance,
    platform_wallet_balance: platformWalletBalance,
    ivisit_fee_percentage: orgFeePercentage,
    coverage_ready: hospitalsReady,
    staffing_ready: staffingReady,
    pricing_ready: pricingReady,
    financial_ready: financialReady,
    dispatch_ready: dispatchReady,
    clean_cycle_ready: cleanCycleReady,
  };
};
