import { formatDistanceMeters } from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { COLORS } from "../../../../constants/colors";
import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";

export function formatClockArrival(remainingSeconds, nowMs = Date.now()) {
  if (!Number.isFinite(remainingSeconds)) return "--";
  const arrivalDate = new Date(nowMs + remainingSeconds * 1000);
  return arrivalDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRemainingShort(remainingSeconds) {
  if (!Number.isFinite(remainingSeconds)) return "--";
  const minutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  return `${minutes} min`;
}

export function formatHospitalDistanceLabel(hospital) {
  if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
    return hospital.distance.trim();
  }

  const distanceKm = Number(hospital?.distanceKm);
  if (Number.isFinite(distanceKm) && distanceKm > 0) {
    return distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
  }

  return "--";
}

export function resolveDistanceLabel(routeInfo, hospital) {
  if (Number.isFinite(routeInfo?.distanceMeters) && routeInfo.distanceMeters > 0) {
    return formatDistanceMeters(routeInfo.distanceMeters) || "--";
  }
  return formatHospitalDistanceLabel(hospital);
}

export function resolveHospitalAddress(hospital) {
  return (
    hospital?.formattedAddress ||
    hospital?.address ||
    hospital?.full_address ||
    [hospital?.street, hospital?.city, hospital?.state]
      .filter(Boolean)
      .join(", ") ||
    ""
  );
}

export function getTrackingTone(telemetryHealth, kind, status) {
  const isResolved = status === "arrived" || status === "completed";
  if (kind === "ambulance") {
    const telemetryState = telemetryHealth?.state ?? "inactive";
    if (telemetryState === "lost") return "critical";
    if (telemetryState === "stale") return "warning";
    if (isResolved) return "success";
    return "live";
  }
  if (kind === "bed") {
    return isResolved ? "success" : "live";
  }
  return "neutral";
}

export function getToneColors({ tone, isDarkMode }) {
  switch (tone) {
    case "critical":
      return {
        surface: isDarkMode ? "rgba(127,29,29,0.32)" : "rgba(254,226,226,0.92)",
        text: isDarkMode ? "#FECACA" : "#991B1B",
        icon: isDarkMode ? "#FCA5A5" : "#B91C1C",
      };
    case "warning":
      return {
        surface: isDarkMode ? "rgba(120,53,15,0.30)" : "rgba(254,243,199,0.94)",
        text: isDarkMode ? "#FDE68A" : "#92400E",
        icon: isDarkMode ? "#FBBF24" : "#B45309",
      };
    case "success":
      return {
        surface: isDarkMode ? "rgba(20,83,45,0.34)" : "rgba(220,252,231,0.95)",
        text: isDarkMode ? "#BBF7D0" : "#166534",
        icon: isDarkMode ? "#4ADE80" : "#16A34A",
      };
    case "live":
      return {
        surface: isDarkMode ? "rgba(134,16,14,0.24)" : "rgba(255,237,233,0.96)",
        text: isDarkMode ? "#FEE4E2" : "#B42318",
        icon: isDarkMode ? "#FDA29B" : "#D92D20",
      };
    default:
      return {
        surface: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.86)",
        text: isDarkMode ? "#E2E8F0" : "#334155",
        icon: isDarkMode ? "#CBD5E1" : "#475569",
      };
  }
}

export function joinDisplayParts(parts = []) {
  return parts
    .filter((part) => typeof part === "string" && part.trim())
    .join(" · ");
}

export function joinSummaryParts(parts = []) {
  return parts
    .filter((part) => typeof part === "string" && part.trim())
    .join(" · ");
}

export function toTitleCaseLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveTransportServiceLabel(value) {
  if (value && typeof value === "object") {
    const fromObject = value.title || value.label || value.name || null;
    if (typeof fromObject === "string" && fromObject.trim()) {
      return fromObject.trim();
    }
  }
  const raw = String(value || "").trim();
  if (!raw) return "Transport";
  const normalized = raw.toLowerCase();
  if (normalized.includes("bls") || normalized.includes("basic")) return "Everyday care";
  if (normalized.includes("als") || normalized.includes("advanced")) return "Extra support";
  if (
    normalized.includes("icu") ||
    normalized.includes("critical") ||
    normalized.includes("transfer")
  ) {
    return "Hospital transfer";
  }
  const visualProfile = getAmbulanceVisualProfile(value);
  if (visualProfile?.key === "basic") return "Everyday care";
  if (visualProfile?.key === "advanced") return "Extra support";
  if (visualProfile?.key === "critical") return "Hospital transfer";
  return visualProfile?.label || raw;
}

export function isGenericTransportLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "transport" ||
    normalized === "ambulance" ||
    normalized === "emergency" ||
    normalized === "request"
  );
}

export function getDetailTone(label, isDarkMode) {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("request")) {
    return {
      surface: isDarkMode ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.14)",
      icon: isDarkMode ? "#93C5FD" : "#1D4ED8",
    };
  }
  if (normalized.includes("vehicle")) {
    return {
      surface: isDarkMode ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
      icon: isDarkMode ? "#86EFAC" : "#15803D",
    };
  }
  if (normalized.includes("team") || normalized.includes("crew")) {
    return {
      surface: isDarkMode ? "rgba(20,184,166,0.22)" : "rgba(20,184,166,0.14)",
      icon: isDarkMode ? "#5EEAD4" : "#0F766E",
    };
  }
  return {
    surface: isDarkMode ? "rgba(180,35,24,0.20)" : "rgba(180,35,24,0.12)",
    icon: isDarkMode ? "#FDA29B" : "#B42318",
  };
}

export { COLORS };
