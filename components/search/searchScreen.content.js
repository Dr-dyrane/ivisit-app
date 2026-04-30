export const SEARCH_DISCOVERY_TABS = [
  { key: "quick-actions", label: "Quick actions" },
  { key: "specialties", label: "Specialties" },
  { key: "trending", label: "Trending" },
  { key: "health-news", label: "Health news" },
];

export const SEARCH_SCREEN_COPY = {
  screen: {
    title: "Search",
    subtitle: "Care search",
  },
  center: {
    idleTitle: "Find care",
    resultsTitle: "Search results",
  },
  context: {
    title: "Search care faster",
    body: "Find hospitals, visits, and alerts from one search.",
    recentLabel: "Recent",
    trendLabel: "Trending",
    focusLabel: "Focus",
    primaryActionIdle: "Search emergency care",
    primaryActionActive: "Clear search",
  },
  island: {
    title: "Quick links",
    searchLabel: "Search status",
    recentLabel: "Recent",
    trendLabel: "Top trend",
    trendingSection: "Trending now",
    historySection: "Recent searches",
  },
  sections: {
    discoveryTitle: "Browse by shortcut",
    resultsTitle: "Matches",
    recentTitle: "Recent searches",
    filterTitle: "Booking focus",
    noResultsTitle: "No matches yet",
    noResultsBody: "Try another hospital, specialty, visit, or alert keyword.",
    noTrendingTitle: "No trending searches yet",
    noTrendingBody: "Pull to refresh when discovery feeds are available.",
    noNewsTitle: "No health news yet",
    noNewsBody: "Pull to refresh for the latest headlines.",
  },
  quickActions: {
    emergency: {
      label: "Emergency care",
      subtitle: "Search urgent help",
      icon: "alert-circle",
      tone: "destructive",
      query: "emergency",
    },
    hospital: {
      label: "Hospitals near me",
      subtitle: "Search nearby care",
      icon: "business",
      tone: "care",
      query: "hospital",
    },
    pharmacy: {
      label: "Pharmacy",
      subtitle: "Search 24/7 support",
      icon: "medical",
      tone: "contacts",
      query: "pharmacy",
    },
  },
  recent: {
    subtitle: "Tap to search again",
  },
  messages: {
    noRecent: "No recent searches yet",
    noTopTrend: "Refreshing trends",
    allCareTypes: "All care types",
    bookingFocus: "Booking search ready",
  },
  discovery: {
    defaultSpecialties: [
      "General Care",
      "Emergency",
      "Cardiology",
      "Neurology",
      "Oncology",
      "Pediatrics",
      "Orthopedics",
      "ICU",
      "Trauma",
      "Urgent Care",
    ],
  },
};
