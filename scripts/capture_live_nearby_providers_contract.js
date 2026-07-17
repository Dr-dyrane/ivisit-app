#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const expectedProjectRef = process.argv
  .find((argument) => argument.startsWith("--project-ref="))
  ?.slice("--project-ref=".length);

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "[nearby-providers-capture] Missing Supabase URL or service-role key.",
  );
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
if (!expectedProjectRef || expectedProjectRef !== projectRef) {
  console.error(
    "[nearby-providers-capture] Refusing to inspect an unconfirmed project reference.",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const signature =
  "public.nearby_providers(double precision,double precision,text,integer,integer)";
const expectedReturnColumns = [
  "id",
  "name",
  "address",
  "latitude",
  "longitude",
  "distance",
  "verified",
  "status",
  "display_id",
  "provider_type",
  "emergency_eligible",
  "dispatch_eligible",
  "booking_eligible",
  "verification_status",
  "provider_source",
  "category_confidence",
  "phone",
  "rating",
  "image",
  "place_id",
];
const marker = "IVISIT_NEARBY_PROVIDERS_CONTRACT:";
const sql = `
DO $capture$
DECLARE
  contract JSONB;
BEGIN
  SELECT jsonb_build_object(
    'definition', pg_get_functiondef(proc.oid),
    'owner', pg_get_userbyid(proc.proowner),
    'security_definer', proc.prosecdef,
    'volatility', proc.provolatile,
    'acl', COALESCE(proc.proacl::TEXT, 'DEFAULT'),
    'anon_execute', has_function_privilege('anon', proc.oid, 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', proc.oid, 'EXECUTE'),
    'service_role_execute', has_function_privilege('service_role', proc.oid, 'EXECUTE')
  )
  INTO contract
  FROM pg_proc AS proc
  WHERE proc.oid = to_regprocedure('${signature}');

  IF contract IS NULL THEN
    RAISE EXCEPTION 'IVISIT_NEARBY_PROVIDERS_MISSING';
  END IF;

  RAISE EXCEPTION '${marker}%',
    encode(convert_to(contract::TEXT, 'UTF8'), 'base64');
END
$capture$;
`;

async function run() {
  const { data, error } = await admin.rpc("exec_sql", { sql });
  if (error) throw error;

  const message = String(data?.error || "");
  const markerIndex = message.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(
      `[nearby-providers-capture] Catalog probe failed: ${message || "no marker returned"}`,
    );
  }

  const encoded = message.slice(markerIndex + marker.length).replace(/\s+/g, "");
  const contract = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  const definition = String(contract?.definition || "");
  if (!definition.includes("CREATE OR REPLACE FUNCTION public.nearby_providers")) {
    throw new Error(
      "[nearby-providers-capture] Decoded catalog response was not the expected function.",
    );
  }

  if (process.argv.includes("--assert-source")) {
    const pillar = fs.readFileSync(
      path.join(
        ROOT,
        "supabase",
        "migrations",
        "20260219010000_core_rpcs.sql",
      ),
      "utf8",
    );
    const sourceBlock = pillar.match(
      /DROP FUNCTION IF EXISTS public\.nearby_providers\([\s\S]*?-- 2\. Nearby Ambulances/,
    )?.[0];
    if (!sourceBlock) {
      throw new Error(
        "[nearby-providers-capture] Canonical pillar block or signature DROP is missing.",
      );
    }

    const returnColumns = (value) =>
      value
        .match(/RETURNS TABLE\s*\(([\s\S]*?)\)\s*(?:AS|LANGUAGE)/i)?.[1]
        ?.split(",")
        .map((column) => column.trim().split(/\s+/)[0].toLowerCase()) || [];
    const liveColumns = returnColumns(definition);
    const sourceColumns = returnColumns(sourceBlock);
    const expected = JSON.stringify(expectedReturnColumns);

    if (
      JSON.stringify(liveColumns) !== expected ||
      JSON.stringify(sourceColumns) !== expected
    ) {
      throw new Error(
        `[nearby-providers-capture] Return-column mismatch: live=${JSON.stringify(liveColumns)} source=${JSON.stringify(sourceColumns)}`,
      );
    }

    const forbidden = [
      "public.providers",
      "provider_services",
      "provider_specialties",
      "insurance_accepted",
      "structured_hours",
      "appointment_required",
      "report_turnaround",
      "age_range",
      "crisis_line",
      "SECURITY DEFINER",
    ];
    for (const fragment of forbidden) {
      if (
        definition.toLowerCase().includes(fragment.toLowerCase()) ||
        sourceBlock.toLowerCase().includes(fragment.toLowerCase())
      ) {
        throw new Error(
          `[nearby-providers-capture] Forbidden unverified detail contract found: ${fragment}`,
        );
      }
    }

    const requiredSourceFragments = [
      "DROP FUNCTION IF EXISTS public.nearby_providers",
      "LANGUAGE plpgsql STABLE;",
      "GRANT EXECUTE ON FUNCTION public.nearby_providers",
      "TO anon, authenticated, service_role;",
      "h.coordinates IS NOT NULL",
      "h.status = 'available'",
      "provider_type_filter IS NULL OR h.provider_type = provider_type_filter",
      "LIMIT result_limit",
    ];
    for (const fragment of requiredSourceFragments) {
      if (!sourceBlock.includes(fragment)) {
        throw new Error(
          `[nearby-providers-capture] Canonical pillar is missing: ${fragment}`,
        );
      }
    }

    if (
      contract.security_definer !== false ||
      contract.volatility !== "s" ||
      !contract.anon_execute ||
      !contract.authenticated_execute ||
      !contract.service_role_execute
    ) {
      throw new Error(
        "[nearby-providers-capture] Live authority metadata differs from the captured contract.",
      );
    }

    console.log(
      "[nearby-providers-capture] PASS live and pillar share the 20-field invoker-rights discovery contract.",
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        project_ref: projectRef,
        signature,
        owner: contract.owner,
        security_definer: contract.security_definer,
        volatility: contract.volatility,
        acl: contract.acl,
        anon_execute: contract.anon_execute,
        authenticated_execute: contract.authenticated_execute,
        service_role_execute: contract.service_role_execute,
      },
      null,
      2,
    ),
  );
  console.log("");
  console.log(definition);
}

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
