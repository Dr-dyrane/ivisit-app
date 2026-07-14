export const SCHEDULED_CARE_MODES = Object.freeze({
  IN_PERSON: "in_person",
  ASYNC_CONSULT: "telemedicine_async",
});

const SCHEDULED_CARE_MODE_SET = new Set(Object.values(SCHEDULED_CARE_MODES));

const toText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readField = (row, camelKey, snakeKey = camelKey) =>
  row?.[camelKey] ?? row?.[snakeKey] ?? null;

export const toValidIsoString = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const isScheduledCareMode = (value) =>
  SCHEDULED_CARE_MODE_SET.has(String(value || "").trim().toLowerCase());

export const isScheduledVisitRow = (row) => {
  if (!row || typeof row !== "object") return false;
  const requestId = readField(row, "requestId", "request_id");
  const careMode = readField(row, "careMode", "care_mode");
  const scheduledStartAt = readField(
    row,
    "scheduledStartAt",
    "scheduled_start_at",
  );

  return (
    (requestId === null || requestId === undefined || requestId === "") &&
    isScheduledCareMode(careMode) &&
    Boolean(toValidIsoString(scheduledStartAt))
  );
};

export const classifyVisitSource = (row) => {
  if (isScheduledVisitRow(row)) return "scheduled_visit";
  const requestId = readField(row, "requestId", "request_id");
  return toText(requestId) ? "emergency" : "legacy_visit";
};

export const getScheduledCareModeLabel = (careMode) =>
  careMode === SCHEDULED_CARE_MODES.ASYNC_CONSULT
    ? "Async consult"
    : careMode === SCHEDULED_CARE_MODES.IN_PERSON
      ? "In person"
      : null;

const buildTimezoneDateKey = (date, timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return values.year && values.month && values.day
      ? `${values.year}-${values.month}-${values.day}`
      : null;
  } catch (_error) {
    return null;
  }
};

const buildTimezoneName = (date, timeZone) => {
  try {
    const zonePart = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName");
    return toText(zonePart?.value) || toText(timeZone);
  } catch (_error) {
    return toText(timeZone);
  }
};

export const formatScheduledVisitParts = ({
  scheduledStartAt,
  scheduledTimezone,
  locale,
} = {}) => {
  const startIso = toValidIsoString(scheduledStartAt);
  if (!startIso) {
    return {
      dateKey: null,
      dateLabel: null,
      timeLabel: null,
      timezoneLabel: toText(scheduledTimezone),
      dateTimeLabel: null,
    };
  }

  const date = new Date(startIso);
  const timeZone = toText(scheduledTimezone);

  try {
    const dateLabel = new Intl.DateTimeFormat(locale, {
      ...(timeZone ? { timeZone } : {}),
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
    const timeLabel = new Intl.DateTimeFormat(locale, {
      ...(timeZone ? { timeZone } : {}),
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    const timezoneLabel = timeZone ? buildTimezoneName(date, timeZone) : null;
    return {
      dateKey:
        (timeZone ? buildTimezoneDateKey(date, timeZone) : null) ||
        startIso.slice(0, 10),
      dateLabel,
      timeLabel,
      timezoneLabel,
      dateTimeLabel: [dateLabel, timeLabel, timezoneLabel]
        .filter(Boolean)
        .join(" - "),
    };
  } catch (_error) {
    const fallbackDate = date.toLocaleDateString(locale);
    const fallbackTime = date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
    return {
      dateKey: startIso.slice(0, 10),
      dateLabel: fallbackDate,
      timeLabel: fallbackTime,
      timezoneLabel: timeZone,
      dateTimeLabel: [fallbackDate, fallbackTime, timeZone]
        .filter(Boolean)
        .join(" - "),
    };
  }
};

export const normalizeScheduledVisitProjection = (row, base = {}) => {
  if (!row || typeof row !== "object") return base;

  const careMode = toText(readField(row, "careMode", "care_mode"));
  const scheduledStartAt = toValidIsoString(
    readField(row, "scheduledStartAt", "scheduled_start_at"),
  );
  const scheduledEndAt = toValidIsoString(
    readField(row, "scheduledEndAt", "scheduled_end_at"),
  );
  const scheduledTimezone = toText(
    readField(row, "scheduledTimezone", "scheduled_timezone"),
  );
  const sourceKind = classifyVisitSource(row);

  return {
    ...base,
    sourceKind,
    patientId: toText(readField(row, "patientId", "user_id")),
    userId: toText(readField(row, "userId", "user_id")),
    doctorId: toText(readField(row, "doctorId", "doctor_id")),
    hospitalId: toText(readField(row, "hospitalId", "hospital_id")),
    careMode,
    careModeLabel: getScheduledCareModeLabel(careMode),
    scheduledStartAt,
    scheduledEndAt,
    scheduledTimezone,
    bookingIdempotencyKey: toText(
      readField(row, "bookingIdempotencyKey", "booking_idempotency_key"),
    ),
    communicationRoomId: toText(
      readField(row, "communicationRoomId", "communication_room_id"),
    ),
    isScheduledVisit: sourceKind === "scheduled_visit",
    hasAsyncConsult:
      sourceKind === "scheduled_visit" &&
      careMode === SCHEDULED_CARE_MODES.ASYNC_CONSULT,
  };
};

export const normalizeAvailabilitySlot = (row) => {
  if (!row || typeof row !== "object") return null;
  const scheduledStartAt = toValidIsoString(row.scheduled_start_at);
  const scheduledEndAt = toValidIsoString(row.scheduled_end_at);
  const careMode = toText(row.care_mode);
  if (!scheduledStartAt || !scheduledEndAt || !isScheduledCareMode(careMode)) {
    return null;
  }

  return {
    hospitalId: toText(row.hospital_id),
    specialty: toText(row.specialty),
    careMode,
    scheduledStartAt,
    scheduledEndAt,
    scheduledTimezone: toText(row.scheduled_timezone),
  };
};

export const groupAvailabilitySlots = (rows = []) => {
  const uniqueByStart = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const slot = normalizeAvailabilitySlot(row) || row;
    if (!slot?.scheduledStartAt || uniqueByStart.has(slot.scheduledStartAt)) {
      return;
    }
    uniqueByStart.set(slot.scheduledStartAt, slot);
  });

  const groups = new Map();
  [...uniqueByStart.values()]
    .sort(
      (left, right) =>
        Date.parse(left.scheduledStartAt) - Date.parse(right.scheduledStartAt),
    )
    .forEach((slot) => {
      const formatted = formatScheduledVisitParts({
        scheduledStartAt: slot.scheduledStartAt,
        scheduledTimezone: slot.scheduledTimezone,
      });
      const dateKey = formatted.dateKey || slot.scheduledStartAt.slice(0, 10);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          key: dateKey,
          dateLabel: formatted.dateLabel,
          timezoneLabel: formatted.timezoneLabel,
          slots: [],
        });
      }
      groups.get(dateKey).slots.push({
        ...slot,
        dateKey,
        dateLabel: formatted.dateLabel,
        timeLabel: formatted.timeLabel,
        timezoneLabel: formatted.timezoneLabel,
      });
    });

  return [...groups.values()];
};

export const buildBookingIntentFingerprint = ({
  hospitalId,
  specialty,
  careMode,
  scheduledStartAt,
  notes,
} = {}) =>
  JSON.stringify({
    hospitalId: toText(hospitalId),
    specialty: toText(specialty)?.toLowerCase() || null,
    careMode: toText(careMode)?.toLowerCase() || null,
    scheduledStartAt: toValidIsoString(scheduledStartAt),
    notes: toText(notes) || null,
  });
