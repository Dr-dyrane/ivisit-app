import { buildDemoContext } from "../_shared/domain/demo/context.ts";
import { ensureDemoFinancialReadiness } from "../_shared/domain/demo/finance.ts";
import {
  ensureDemoHospitals,
  getNearbySeedHospitals,
} from "../_shared/domain/demo/hospitals.ts";
import { ensureDemoOrganization } from "../_shared/domain/demo/organization.ts";
import { ensureDemoPricing } from "../_shared/domain/demo/pricing.ts";
import { ensureDemoStaff } from "../_shared/domain/demo/staff.ts";
import { getDemoSummary } from "../_shared/domain/demo/summary.ts";
import {
  toFiniteNumber,
  toSafeString,
} from "../_shared/domain/demo/utils.ts";
import { jsonResponse, optionsResponse } from "../_shared/http/cors.ts";
import {
  runTimedStep,
  type TimedStepEntry,
} from "../_shared/observability/timing.ts";
import {
  createServiceClient,
  createUserClient,
} from "../_shared/supabase/clients.ts";

export const handleBootstrapDemoEcosystemRequest = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const body = await req.json();
    const phase = toSafeString(body?.phase, "full");
    const requestedUserId = toSafeString(body?.userId, "");
    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    const radiusKm = Math.max(
      1,
      Math.min(100, Math.round(toFiniteNumber(body?.radiusKm) ?? 50)),
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }

    const userClient = createUserClient(authHeader);
    const adminClient = createServiceClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    const effectiveUserId =
      !userError && user?.id
        ? String(user.id)
        : toSafeString(requestedUserId, "");

    if (!effectiveUserId) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = buildDemoContext(
      effectiveUserId,
      Number(latitude),
      Number(longitude),
      radiusKm,
    );

    const timeline: TimedStepEntry[] = [];
    const runStep = <TData>(step: string, action: () => Promise<TData>) =>
      runTimedStep(timeline, step, action);

    const organizationResult = await runStep("ensure_org", () =>
      ensureDemoOrganization(adminClient, ctx),
    );

    const organizationId = organizationResult.organization.id;
    let hospitals: any[] = [];

    if (phase === "prepare") {
      const nearbySeeds = await runStep("preview_nearby_sources", () =>
        getNearbySeedHospitals(adminClient, ctx),
      );

      return jsonResponse(
        {
          ok: true,
          phase,
          organization_id: organizationId,
          preview: {
            nearby_candidates: nearbySeeds.slice(0, 5).map((seed: any) => ({
              name: seed.name,
              address: seed.address,
              distance_km: seed.distance_km,
            })),
            candidate_count: nearbySeeds.length,
          },
          timeline,
        },
        { status: 200 },
      );
    }

    if (
      phase === "hospitals" ||
      phase === "staff" ||
      phase === "pricing" ||
      phase === "full"
    ) {
      hospitals = await runStep("ensure_demo_hospitals", () =>
        ensureDemoHospitals(adminClient, ctx, organizationId, null),
      );
    }

    if (phase === "staff" || phase === "pricing" || phase === "full") {
      const staffing = await runStep("ensure_demo_staff", () =>
        ensureDemoStaff(adminClient, ctx, organizationId, hospitals),
      );

      hospitals = await runStep("refresh_demo_hospitals_after_staff", () =>
        ensureDemoHospitals(
          adminClient,
          ctx,
          organizationId,
          staffing.org_admin_profile_id ?? null,
        ),
      );
    }

    if (phase === "pricing" || phase === "full") {
      await runStep("ensure_demo_finance", () =>
        ensureDemoFinancialReadiness(adminClient, organizationId),
      );
      await runStep("ensure_demo_pricing", () =>
        ensureDemoPricing(adminClient, hospitals),
      );
    }

    const summary = await runStep("summary", () =>
      getDemoSummary(adminClient, ctx, organizationId),
    );

    return jsonResponse(
      {
        ok: true,
        phase,
        organization_id: organizationId,
        hospitals: hospitals.map((hospital: any) => ({
          id: hospital.id,
          name: hospital.name,
          place_id: hospital.place_id,
        })),
        summary,
        timeline,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
};
