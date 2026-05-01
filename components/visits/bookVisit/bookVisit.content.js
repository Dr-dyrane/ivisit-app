export const BOOK_VISIT_SERVICE_OPTIONS = [
  {
    key: "clinic",
    title: "In-clinic",
    body: "Book care at a nearby hospital or clinic.",
  },
  {
    key: "telehealth",
    title: "Telehealth",
    body: "Meet a clinician by video from home.",
  },
];

export const BOOK_VISIT_DOCTOR_NAMES = [
  "Dr. Sarah Wilson",
  "Dr. James Chen",
  "Dr. Emily Rodriguez",
  "Dr. Michael Chang",
  "Dr. Lisa Thompson",
  "Dr. David Kim",
  "Dr. Rachel Foster",
  "Dr. Robert Patel",
];

export const BOOK_VISIT_TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
];

export const BOOK_VISIT_SCREEN_COPY = {
  screen: {
    title: "Book a visit",
    subtitle: "Visits",
  },
  center: {
    title: "Schedule care",
  },
  context: {
    title: "Visit in progress",
    body: "Choose care, time, and provider. Progress is saved while you book.",
    selectionsLabel: "Current selection",
    quoteLabel: "Estimate",
  },
  island: {
    title: "Booking summary",
    stepLabel: "Current step",
    serviceLabel: "Care type",
    specialtyLabel: "Specialty",
    providerLabel: "Provider",
    timeLabel: "Visit time",
  },
  steps: {
    service: {
      title: "Choose care type",
      body: "Start with how you want to be seen.",
    },
    specialty: {
      title: "Pick a specialty",
      body: "Choose the care area that fits this visit.",
    },
    provider: {
      title: "Choose a provider",
      body: "Select a hospital or clinic that can take this visit.",
    },
    datetime: {
      title: "Pick date and time",
      body: "Choose the next available slot that works for you.",
    },
    summary: {
      title: "Confirm your booking",
      body: "Review the visit details before you submit.",
    },
  },
  compact: {
    noSelection: "Nothing selected yet",
  },
  messages: {
    dateTimeRequired: "Choose a date and time to continue.",
    quoteFailed: "Unable to load the visit estimate right now.",
    saveSuccess: "Visit booked successfully.",
    saveFailed: "Unable to book this visit right now.",
    cashBlocked:
      "This provider is not ready for cash-backed booking right now.",
    noSpecialties: "No specialties available right now.",
    noProviders: "No providers found for this specialty.",
    noQuote: "Estimate unavailable",
  },
};

export default BOOK_VISIT_SCREEN_COPY;
