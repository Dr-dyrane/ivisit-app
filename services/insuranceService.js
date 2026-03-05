import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { notificationDispatcher } from "./notificationDispatcher";

const TABLE_NAME = "insurance_policies";

function parseCoverageDetails(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return { ...value };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function toNullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function parseLinkedPaymentSnapshot(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeLinkedPaymentValue(value) {
  if (value === undefined) {
    return { normalized: undefined, snapshot: undefined };
  }
  if (value === null || value === "") {
    return { normalized: null, snapshot: null };
  }
  if (typeof value === "string") {
    return { normalized: value, snapshot: undefined };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const methodId =
      value.id ||
      value.method_id ||
      value.payment_method_id ||
      value.reference_id ||
      null;

    return {
      normalized: methodId || undefined,
      snapshot: value,
    };
  }
  return { normalized: null, snapshot: undefined };
}

function buildCoverageDetails(input = {}, existingDetails = {}) {
  const details = {
    ...parseCoverageDetails(existingDetails),
  };

  const legacyKeys = [
    "group_number",
    "policy_holder_name",
    "front_image_url",
    "back_image_url",
    "coverage_amount",
  ];

  for (const key of legacyKeys) {
    if (input[key] === undefined) continue;
    if (input[key] === null || input[key] === "") {
      delete details[key];
      continue;
    }
    details[key] = input[key];
  }

  if (input.coverage_details && typeof input.coverage_details === "object") {
    Object.assign(details, input.coverage_details);
  }

  if (
    input.coverage_type !== undefined ||
    input.plan_type !== undefined ||
    input.policy_type !== undefined
  ) {
    const nextCoverageType = input.coverage_type ?? input.plan_type ?? input.policy_type;
    if (nextCoverageType === null || nextCoverageType === "") {
      delete details.coverage_type;
    } else {
      details.coverage_type = nextCoverageType;
    }
  }

  if (input.linked_payment_method_snapshot !== undefined) {
    if (
      input.linked_payment_method_snapshot === null ||
      input.linked_payment_method_snapshot === ""
    ) {
      delete details.linked_payment_method_snapshot;
    } else {
      details.linked_payment_method_snapshot = input.linked_payment_method_snapshot;
    }
  }

  return details;
}

function normalizeInsurancePolicy(record) {
  if (!record) return record;
  const details = parseCoverageDetails(record.coverage_details);
  const linkedPaymentSnapshot =
    parseLinkedPaymentSnapshot(details.linked_payment_method_snapshot) ||
    parseLinkedPaymentSnapshot(record.linked_payment_method);

  return {
    ...record,
    coverage_type: record.plan_type || details.coverage_type || "",
    policy_type: record.plan_type || details.coverage_type || "",
    start_date: record.starts_at || "",
    end_date: record.expires_at || "",
    policy_holder_name: details.policy_holder_name || "",
    group_number: details.group_number || "",
    front_image_url: details.front_image_url || "",
    back_image_url: details.back_image_url || "",
    linked_payment_method: linkedPaymentSnapshot || record.linked_payment_method || null,
    coverage_amount:
      details.coverage_amount ??
      (record.coverage_percentage !== null && record.coverage_percentage !== undefined
        ? Number(record.coverage_percentage)
        : 0),
  };
}

function buildInsuranceWritePayload(
  input = {},
  { userId = null, forInsert = false, existingCoverageDetails = {} } = {}
) {
  const now = new Date().toISOString();
  const payload = {};

  const assignIfDefined = (key, value) => {
    if (value !== undefined) payload[key] = value;
  };

  assignIfDefined("provider_name", input.provider_name);
  assignIfDefined("policy_number", input.policy_number);

  if (
    input.coverage_type !== undefined ||
    input.plan_type !== undefined ||
    input.policy_type !== undefined
  ) {
    assignIfDefined("plan_type", input.coverage_type ?? input.plan_type ?? input.policy_type ?? null);
  }
  if (input.start_date !== undefined || input.starts_at !== undefined) {
    assignIfDefined("starts_at", input.start_date ?? input.starts_at ?? null);
  }
  if (input.end_date !== undefined || input.expires_at !== undefined) {
    assignIfDefined("expires_at", input.end_date ?? input.expires_at ?? null);
  }
  if (input.status !== undefined) {
    assignIfDefined("status", input.status || "active");
  }
  if (input.verified !== undefined) {
    assignIfDefined("verified", !!input.verified);
  }
  if (input.is_default !== undefined) {
    assignIfDefined("is_default", !!input.is_default);
  }

  const { normalized: linkedPaymentMethod, snapshot: linkedPaymentSnapshot } =
    normalizeLinkedPaymentValue(input.linked_payment_method);
  assignIfDefined("linked_payment_method", linkedPaymentMethod);

  const coveragePercentage =
    input.coverage_percentage !== undefined ? input.coverage_percentage : input.coverage_amount;
  const parsedCoveragePercentage = toNullableNumber(coveragePercentage);
  if (parsedCoveragePercentage !== undefined) {
    payload.coverage_percentage = parsedCoveragePercentage;
  }

  const hasLegacyCoverageInput =
    input.group_number !== undefined ||
    input.policy_holder_name !== undefined ||
    input.front_image_url !== undefined ||
    input.back_image_url !== undefined ||
    input.coverage_amount !== undefined ||
    input.coverage_details !== undefined ||
    input.coverage_type !== undefined ||
    input.plan_type !== undefined ||
    input.policy_type !== undefined ||
    linkedPaymentSnapshot !== undefined ||
    input.linked_payment_method_snapshot !== undefined;

  if (hasLegacyCoverageInput) {
    payload.coverage_details = buildCoverageDetails(
      {
        ...input,
        linked_payment_method_snapshot:
          input.linked_payment_method_snapshot !== undefined
            ? input.linked_payment_method_snapshot
            : linkedPaymentSnapshot,
      },
      existingCoverageDetails
    );
  }

  if (forInsert) {
    payload.user_id = input.user_id || userId || null;
    if (payload.status === undefined) payload.status = "active";
    if (payload.verified === undefined) payload.verified = false;
    payload.created_at = now;
  } else if (input.user_id !== undefined) {
    payload.user_id = input.user_id || null;
  }

  payload.updated_at = now;
  return payload;
}

export const insuranceService = {
  async list() {
    const local = await database.read(StorageKeys.INSURANCE_POLICIES, []);
    const localNormalized = Array.isArray(local) ? local.map(normalizeInsurancePolicy) : [];

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return localNormalized;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", session.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      const normalized = data.map(normalizeInsurancePolicy);
      await database.write(StorageKeys.INSURANCE_POLICIES, normalized);
      return normalized;
    }

    return localNormalized;
  },

  async getPolicies() {
    return this.list();
  },

  async create(policy) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { count } = await supabase
      .from(TABLE_NAME)
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const isFirst = count === 0;
    const payload = buildInsuranceWritePayload(policy, {
      userId: user.id,
      forInsert: true,
    });

    if (!payload.provider_name) payload.provider_name = "iVisit Basic";
    if (!payload.plan_type) payload.plan_type = "basic";
    if (!payload.status) payload.status = "active";
    if (!payload.expires_at) {
      payload.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (!payload.coverage_details) {
      payload.coverage_details = { limit: 50000, type: "emergency_transport" };
    }
    payload.is_default = isFirst;

    const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select().single();

    if (error) {
      console.error("Failed to create insurance policy:", error);
      throw error;
    }

    const normalized = normalizeInsurancePolicy(data);
    try {
      await notificationDispatcher.dispatchInsuranceUpdate("created", normalized);
    } catch (err) {
      console.warn("Failed to dispatch insurance notification:", err);
    }

    return normalized;
  },

  async createPolicy(policy) {
    return this.create({
      provider_name: policy.providerName,
      policy_number: policy.policyNumber,
      plan_type: policy.planType,
      coverage_details: policy.coverageDetails,
    });
  },

  async update(id, updates) {
    const { data: existingPolicy, error: existingError } = await supabase
      .from(TABLE_NAME)
      .select("coverage_details")
      .eq("id", id)
      .single();

    if (existingError && existingError.code !== "PGRST116") throw existingError;

    const payload = buildInsuranceWritePayload(updates, {
      forInsert: false,
      existingCoverageDetails: existingPolicy?.coverage_details || {},
    });

    const { error, data } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return normalizeInsurancePolicy(data);
  },

  async delete(id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: policy } = await supabase
      .from(TABLE_NAME)
      .select("is_default, user_id")
      .eq("id", id)
      .single();

    if (policy?.is_default) {
      const { count } = await supabase
        .from(TABLE_NAME)
        .select("*", { count: "exact", head: true })
        .eq("user_id", policy.user_id || user?.id || "");

      if (count > 1) {
        throw new Error(
          "Cannot delete default policy. Please set another policy as default first."
        );
      }
      throw new Error(
        "Cannot delete your only insurance policy. You must have at least one active scheme."
      );
    }

    const query = supabase.from(TABLE_NAME).delete().eq("id", id);
    const { error } = user?.id ? await query.eq("user_id", user.id) : await query;

    if (error) throw error;
    return true;
  },

  async setDefault(id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    await supabase
      .from(TABLE_NAME)
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return normalizeInsurancePolicy(data);
  },

  async linkPaymentMethod(id, paymentMethod) {
    const { data: existingPolicy, error: existingError } = await supabase
      .from(TABLE_NAME)
      .select("coverage_details")
      .eq("id", id)
      .single();

    if (existingError && existingError.code !== "PGRST116") throw existingError;

    const payload = buildInsuranceWritePayload(
      { linked_payment_method: paymentMethod },
      {
        forInsert: false,
        existingCoverageDetails: existingPolicy?.coverage_details || {},
      }
    );

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return normalizeInsurancePolicy(data);
  },

  async enrollBasicScheme() {
    return null;
  },

  async uploadImage(uri) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const ext = uri.substring(uri.lastIndexOf(".") + 1);
      const fileName = `insurance/${user.id}/${Date.now()}.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error } = await supabase.storage.from("documents").upload(fileName, decode(base64), {
        contentType: `image/${ext}`,
        upsert: false,
      });

      if (error) throw error;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileName, 60 * 60);

      if (signedError) throw signedError;

      return signedData.signedUrl;
    } catch (error) {
      console.error("Error uploading insurance image:", error);
      throw error;
    }
  },
};
