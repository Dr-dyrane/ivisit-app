export const BOOK_VISIT_SERVICE_OPTIONS = [
  {
    key: "in_person",
    title: "In person",
    body: "Schedule care at an eligible hospital.",
    icon: "business",
  },
  {
    key: "telemedicine_async",
    title: "Async consult",
    body: "Message your assigned clinician before and during scheduled care.",
    icon: "chatbubbles",
  },
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
    title: "Booking in progress",
    body: "Choose care, a facility, and an available time. Progress is saved while you book.",
    selectionsLabel: "Current selection",
  },
  island: {
    title: "Booking summary",
    stepLabel: "Current step",
    serviceLabel: "Care type",
    specialtyLabel: "Specialty",
    providerLabel: "Facility",
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
      title: "Choose a facility",
      body: "Select a hospital with available booking.",
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
    saveSuccess: "Visit booked successfully.",
    saveFailed: "Unable to book this visit right now.",
    bookingUnavailable: "Scheduled booking is temporarily unavailable.",
    timezoneUnconfirmed:
      "Scheduling times are not ready for this facility yet.",
    noSpecialties: "No specialties available right now.",
    noProviders: "No available facilities match this specialty.",
    noAvailability: "No times are available for this selection.",
  },
};

export default BOOK_VISIT_SCREEN_COPY;
