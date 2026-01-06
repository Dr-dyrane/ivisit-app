// data/emergencyServices.js - Emergency services and ambulance data

export const AMBULANCE_TYPES = [
  {
    id: "basic",
    name: "Basic Life Support (BLS)",
    description: "Standard ambulance with basic medical equipment",
    price: "$300-400",
    eta: "5-8 mins",
    features: ["CPR Equipment", "Oxygen", "Basic Medications", "Stretcher"],
    icon: "car-outline",
  },
  {
    id: "advanced",
    name: "Advanced Life Support (ALS)",
    description: "Advanced ambulance with paramedic team",
    price: "$500-700",
    eta: "3-6 mins",
    features: ["Cardiac Monitor", "Defibrillator", "IV Medications", "Intubation"],
    icon: "car",
  },
  {
    id: "critical",
    name: "Critical Care Transport",
    description: "Mobile ICU for critical patients",
    price: "$800-1200",
    eta: "2-4 mins",
    features: ["Ventilator", "Blood Products", "Specialized Monitoring", "ICU Nurse"],
    icon: "medical",
  },
];

export const ACTIVE_AMBULANCES = [
  {
    id: "amb_001",
    type: "advanced",
    callSign: "Medic 1",
    status: "available",
    location: { latitude: 37.7849, longitude: -122.4194 },
    eta: "3 mins",
    crew: ["Paramedic", "EMT"],
    hospital: "City General Hospital",
  },
  {
    id: "amb_002",
    type: "basic",
    callSign: "Rescue 2",
    status: "en_route",
    location: { latitude: 37.7649, longitude: -122.4294 },
    eta: "7 mins",
    crew: ["EMT", "EMT"],
    hospital: "St. Mary's Medical Center",
  },
  {
    id: "amb_003",
    type: "critical",
    callSign: "Critical 1",
    status: "available",
    location: { latitude: 37.7549, longitude: -122.4394 },
    eta: "2 mins",
    crew: ["Paramedic", "ICU Nurse", "EMT"],
    hospital: "University Medical Center",
  },
];

export const EMERGENCY_CONTACTS = [
  {
    id: "911",
    name: "Emergency Services",
    number: "911",
    description: "Fire, Police, Medical Emergency",
    type: "emergency",
    available24h: true,
  },
  {
    id: "poison",
    name: "Poison Control",
    number: "1-800-222-1222",
    description: "Poison emergencies and information",
    type: "medical",
    available24h: true,
  },
  {
    id: "mental_health",
    name: "Crisis Hotline",
    number: "988",
    description: "Mental health crisis support",
    type: "mental_health",
    available24h: true,
  },
];

export const EMERGENCY_PROCEDURES = [
  {
    id: "cardiac_arrest",
    name: "Cardiac Arrest",
    steps: [
      "Call 911 immediately",
      "Check for responsiveness",
      "Start CPR if trained",
      "Use AED if available",
      "Continue until help arrives",
    ],
    priority: "critical",
  },
  {
    id: "choking",
    name: "Choking",
    steps: [
      "Encourage coughing",
      "Give 5 back blows",
      "Give 5 abdominal thrusts",
      "Repeat until object dislodged",
      "Call 911 if unsuccessful",
    ],
    priority: "urgent",
  },
  {
    id: "severe_bleeding",
    name: "Severe Bleeding",
    steps: [
      "Apply direct pressure",
      "Elevate the wound",
      "Use pressure points if needed",
      "Apply tourniquet if trained",
      "Call 911 immediately",
    ],
    priority: "critical",
  },
];

export const MEDICAL_CONDITIONS = [
  {
    id: "heart_attack",
    name: "Heart Attack",
    symptoms: ["Chest pain", "Shortness of breath", "Nausea", "Sweating"],
    action: "Call 911 immediately",
    priority: "critical",
  },
  {
    id: "stroke",
    name: "Stroke",
    symptoms: ["Face drooping", "Arm weakness", "Speech difficulty", "Time critical"],
    action: "Call 911 - Time is brain",
    priority: "critical",
  },
  {
    id: "allergic_reaction",
    name: "Severe Allergic Reaction",
    symptoms: ["Difficulty breathing", "Swelling", "Hives", "Rapid pulse"],
    action: "Use EpiPen if available, call 911",
    priority: "urgent",
  },
];

// Mock API responses for development
export const MOCK_API_RESPONSES = {
  requestAmbulance: {
    success: true,
    requestId: "REQ_" + Date.now(),
    estimatedArrival: "4 minutes",
    ambulanceId: "amb_001",
    trackingUrl: "/track/REQ_" + Date.now(),
  },
  bookBed: {
    success: true,
    bookingId: "BED_" + Date.now(),
    hospitalId: "1",
    bedType: "emergency",
    estimatedWait: "15 minutes",
    confirmationCode: "CONF" + Math.random().toString(36).substr(2, 6).toUpperCase(),
  },
};
