// data/visits.js - Mock visits data for iVisit appointments

// Visit status types
export const VISIT_STATUS = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
  RESCHEDULED: "rescheduled",
  NO_SHOW: "no_show",
};

// Visit types
export const VISIT_TYPES = {
  CHECKUP: "Check-up",
  FOLLOWUP: "Follow-up",
  EMERGENCY: "Emergency",
  CONSULTATION: "Consultation",
  PROCEDURE: "Procedure",
  VACCINATION: "Vaccination",
  LAB_WORK: "Lab Work",
  IMAGING: "Imaging",
  THERAPY: "Therapy",
  SURGERY: "Surgery",
  TELEHEALTH: "Telehealth",
};

// Filter options for the UI
export const VISIT_FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// Doctor images for variety
const DOCTOR_IMAGES = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400",
  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400",
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400",
  "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400",
];

// Mock visits data - extensive realistic data
export const VISITS = [
  // ===== UPCOMING VISITS =====
  {
    id: "1",
    hospital: "City General Hospital",
    doctor: "Dr. Emily Johnson",
    doctorImage: DOCTOR_IMAGES[0],
    specialty: "Cardiology",
    date: "2026-01-15",
    time: "10:00 AM",
    type: VISIT_TYPES.CHECKUP,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400",
    address: "123 Medical Plaza, Downtown",
    phone: "+1-555-0123",
    notes: "Annual heart check-up. Bring previous ECG reports.",
    estimatedDuration: "45 mins",
    preparation: ["Fasting not required", "Wear comfortable clothing", "Bring medication list"],
    cost: "$150",
    insuranceCovered: true,
    roomNumber: "Cardiology Suite 302",
  },
  {
    id: "4",
    hospital: "Metro Health Center",
    doctor: "Dr. James Wilson",
    doctorImage: DOCTOR_IMAGES[3],
    specialty: "Internal Medicine",
    date: "2026-01-20",
    time: "9:00 AM",
    type: VISIT_TYPES.CONSULTATION,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400",
    address: "321 Community Care St",
    phone: "+1-555-0321",
    notes: "Initial consultation for chronic fatigue syndrome.",
    estimatedDuration: "1 hour",
    preparation: ["Keep a symptom diary for 1 week", "List all medications and supplements"],
    cost: "$200",
    insuranceCovered: true,
    roomNumber: "Suite 105",
  },
  {
    id: "5",
    hospital: "University Medical Center",
    doctor: "Dr. Lisa Chen",
    doctorImage: DOCTOR_IMAGES[4],
    specialty: "Neurology",
    date: "2026-01-25",
    time: "11:30 AM",
    type: VISIT_TYPES.IMAGING,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400",
    address: "100 University Ave, Medical Campus",
    phone: "+1-555-0100",
    notes: "MRI scan for headache diagnosis. Contrast may be used.",
    estimatedDuration: "1.5 hours",
    preparation: ["No metal objects", "Inform if claustrophobic", "Arrive 30 mins early"],
    cost: "$850",
    insuranceCovered: true,
    roomNumber: "Imaging Center B2",
  },
  {
    id: "6",
    hospital: "Pacific Heart Institute",
    doctor: "Dr. Robert Martinez",
    doctorImage: DOCTOR_IMAGES[1],
    specialty: "Cardiac Surgery",
    date: "2026-01-28",
    time: "8:00 AM",
    type: VISIT_TYPES.PROCEDURE,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400",
    address: "800 Heartbeat Way, Medical Row",
    phone: "+1-555-0800",
    notes: "Cardiac catheterization procedure. Pre-op clearance required.",
    estimatedDuration: "3 hours",
    preparation: ["NPO after midnight", "Arrange ride home", "Wear loose clothing", "Stop blood thinners 5 days before"],
    cost: "$4,500",
    insuranceCovered: true,
    roomNumber: "Cath Lab 1",
    preOpRequired: true,
  },
  {
    id: "7",
    hospital: "Children's Memorial Hospital",
    doctor: "Dr. Sarah Kim",
    doctorImage: DOCTOR_IMAGES[5],
    specialty: "Pediatrics",
    date: "2026-02-01",
    time: "2:00 PM",
    type: VISIT_TYPES.VACCINATION,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400",
    address: "500 Rainbow Drive, Children's Campus",
    phone: "+1-555-0500",
    notes: "Annual flu shot and wellness check for Emma (age 7).",
    estimatedDuration: "30 mins",
    preparation: ["Bring vaccination record", "Child should eat beforehand"],
    cost: "$0 (covered)",
    insuranceCovered: true,
    roomNumber: "Pediatric Wing 201",
    patientName: "Emma Thompson",
    patientRelation: "Daughter",
  },
  {
    id: "8",
    hospital: "Neurological Sciences Center",
    doctor: "Dr. David Park",
    doctorImage: DOCTOR_IMAGES[2],
    specialty: "Neurology",
    date: "2026-02-05",
    time: "10:30 AM",
    type: VISIT_TYPES.FOLLOWUP,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400",
    address: "1200 Brain Trust Blvd",
    phone: "+1-555-1200",
    notes: "Follow-up for migraine management. Bring headache diary.",
    estimatedDuration: "45 mins",
    preparation: ["Complete headache diary", "List any new symptoms", "Bring current medications"],
    cost: "$175",
    insuranceCovered: true,
    roomNumber: "Neuro Clinic 405",
  },
  {
    id: "9",
    hospital: "Golden Gate Orthopedic Center",
    doctor: "Dr. Michael Torres",
    doctorImage: DOCTOR_IMAGES[1],
    specialty: "Orthopedics",
    date: "2026-02-10",
    time: "3:30 PM",
    type: VISIT_TYPES.THERAPY,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400",
    address: "1400 Golden Gate Ave",
    phone: "+1-555-1400",
    notes: "Physical therapy session #4 for rotator cuff injury.",
    estimatedDuration: "1 hour",
    preparation: ["Wear athletic clothing", "Bring resistance bands if provided"],
    cost: "$120",
    insuranceCovered: true,
    roomNumber: "Rehab Gym 2",
    sessionNumber: 4,
    totalSessions: 12,
  },
  {
    id: "10",
    hospital: "Wellness First Hospital",
    doctor: "Dr. Amanda Liu",
    doctorImage: DOCTOR_IMAGES[4],
    specialty: "Gastroenterology",
    date: "2026-02-15",
    time: "7:00 AM",
    type: VISIT_TYPES.PROCEDURE,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=400",
    address: "950 Wellness Way",
    phone: "+1-555-0950",
    notes: "Colonoscopy screening. Prep instructions sent separately.",
    estimatedDuration: "2 hours",
    preparation: ["Clear liquid diet day before", "Complete bowel prep", "Arrange ride home", "NPO after midnight"],
    cost: "$1,200",
    insuranceCovered: true,
    roomNumber: "Endoscopy Suite A",
    preOpRequired: true,
  },
  {
    id: "25",
    hospital: "Marina Family Health",
    doctor: "Dr. Jennifer Adams",
    doctorImage: DOCTOR_IMAGES[0],
    specialty: "Family Medicine",
    date: "2026-02-20",
    time: "4:00 PM",
    type: VISIT_TYPES.TELEHEALTH,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1519494140681-8b17d830a3e9?w=400",
    address: "Video Visit",
    phone: "+1-555-2200",
    notes: "Virtual follow-up for medication review. Link will be sent via email.",
    estimatedDuration: "20 mins",
    preparation: ["Test video/audio beforehand", "Be in quiet, private location", "Have medication bottles ready"],
    cost: "$50",
    insuranceCovered: true,
    roomNumber: "N/A - Telehealth",
    telehealth: true,
    meetingLink: "https://telehealth.ivisit.com/room/abc123",
  },

  // ===== COMPLETED VISITS =====
  {
    id: "2",
    hospital: "St. Mary's Medical Center",
    doctor: "Dr. Michael Lee",
    doctorImage: DOCTOR_IMAGES[1],
    specialty: "Orthopedics",
    date: "2026-01-10",
    time: "2:30 PM",
    type: VISIT_TYPES.FOLLOWUP,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400",
    address: "456 Healthcare Ave, Medical District",
    phone: "+1-555-0456",
    notes: "Post-surgery follow-up for knee replacement.",
    estimatedDuration: "30 mins",
    summary: "Recovery progressing well. Range of motion improved to 110°. Continue physical therapy 2x/week.",
    prescriptions: ["Acetaminophen 500mg as needed", "Physical therapy exercises"],
    cost: "$125",
    insuranceCovered: true,
    roomNumber: "Ortho Clinic 205",
    nextVisit: "2026-02-10",
  },
  {
    id: "3",
    hospital: "Emergency Care Unit",
    doctor: "Dr. Sarah Parker",
    doctorImage: DOCTOR_IMAGES[5],
    specialty: "Emergency Medicine",
    date: "2026-01-05",
    time: "8:00 PM",
    type: VISIT_TYPES.EMERGENCY,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=400",
    address: "789 Quick Response Blvd",
    phone: "+1-555-0789",
    notes: "Allergic reaction to shellfish - anaphylaxis.",
    estimatedDuration: "2 hours",
    summary: "Treated with epinephrine and IV steroids. Monitored for 2 hours. Stable for discharge.",
    prescriptions: ["EpiPen 2-pack", "Prednisone 40mg x 5 days", "Benadryl 25mg as needed"],
    cost: "$1,850",
    insuranceCovered: true,
    roomNumber: "ER Bay 7",
    followUp: "Allergist referral provided",
  },
  {
    id: "11",
    hospital: "Bay Area Medical Clinic",
    doctor: "Dr. Kevin Brown",
    doctorImage: DOCTOR_IMAGES[2],
    specialty: "Urgent Care",
    date: "2026-01-02",
    time: "11:00 AM",
    type: VISIT_TYPES.CHECKUP,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
    address: "150 Bay Street",
    phone: "+1-555-0150",
    notes: "Walk-in for flu-like symptoms.",
    estimatedDuration: "30 mins",
    summary: "Diagnosed with viral upper respiratory infection. Symptomatic treatment recommended.",
    prescriptions: ["Rest and hydration", "Tylenol for fever", "Mucinex DM for congestion"],
    cost: "$95",
    insuranceCovered: true,
    roomNumber: "Exam Room 3",
  },
  {
    id: "12",
    hospital: "Oncology & Cancer Institute",
    doctor: "Dr. Patricia Wong",
    doctorImage: DOCTOR_IMAGES[0],
    specialty: "Oncology",
    date: "2025-12-28",
    time: "9:00 AM",
    type: VISIT_TYPES.PROCEDURE,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400",
    address: "2000 Hope Avenue",
    phone: "+1-555-2000",
    notes: "Chemotherapy session 4 of 6.",
    estimatedDuration: "4 hours",
    summary: "Infusion completed without complications. Mild nausea managed with ondansetron. Blood counts stable.",
    prescriptions: ["Ondansetron 8mg as needed", "Dexamethasone 4mg x 3 days", "Hydration protocol"],
    cost: "$8,500",
    insuranceCovered: true,
    roomNumber: "Infusion Center C",
    sessionNumber: 4,
    totalSessions: 6,
  },
  {
    id: "13",
    hospital: "Hillside Medical Center",
    doctor: "Dr. Thomas Anderson",
    doctorImage: DOCTOR_IMAGES[3],
    specialty: "Sports Medicine",
    date: "2025-12-20",
    time: "4:00 PM",
    type: VISIT_TYPES.CONSULTATION,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?w=400",
    address: "400 Hillside Ave",
    phone: "+1-555-0400",
    notes: "Evaluation for recurring ankle sprains.",
    estimatedDuration: "45 mins",
    summary: "Grade 2 lateral ankle instability. Recommend custom orthotics and physical therapy. Surgery not indicated at this time.",
    prescriptions: ["Custom orthotics fitting", "Ankle strengthening exercises", "PT referral"],
    cost: "$200",
    insuranceCovered: true,
    roomNumber: "Sports Clinic 102",
  },
  {
    id: "14",
    hospital: "Presidio Health Campus",
    doctor: "Dr. Rachel Green",
    doctorImage: DOCTOR_IMAGES[4],
    specialty: "Psychiatry",
    date: "2025-12-15",
    time: "2:00 PM",
    type: VISIT_TYPES.THERAPY,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=400",
    address: "1 Presidio Park Road",
    phone: "+1-555-0001",
    notes: "Monthly medication management and therapy session.",
    estimatedDuration: "1 hour",
    summary: "Mood stable on current medications. Continue current regimen. Discussed coping strategies for holiday stress.",
    prescriptions: ["Sertraline 100mg daily (continued)", "Hydroxyzine 25mg as needed for anxiety"],
    cost: "$250",
    insuranceCovered: true,
    roomNumber: "Behavioral Health 310",
    nextVisit: "2026-01-15",
  },
  {
    id: "15",
    hospital: "Harbor View Medical",
    doctor: "Dr. William Chen",
    doctorImage: DOCTOR_IMAGES[2],
    specialty: "Pulmonology",
    date: "2025-12-10",
    time: "10:00 AM",
    type: VISIT_TYPES.LAB_WORK,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1512678080149-05d4a0999de0?w=400",
    address: "1100 Harbor Boulevard",
    phone: "+1-555-1100",
    notes: "Pulmonary function test for asthma assessment.",
    estimatedDuration: "1 hour",
    summary: "FEV1 78% predicted. Mild persistent asthma confirmed. Inhaler technique reviewed and corrected.",
    prescriptions: ["Symbicort 160/4.5 twice daily", "Albuterol rescue inhaler", "Asthma action plan provided"],
    cost: "$350",
    insuranceCovered: true,
    roomNumber: "Pulmonary Lab 1",
  },
  {
    id: "16",
    hospital: "Valley Surgical Center",
    doctor: "Dr. Mark Johnson",
    doctorImage: DOCTOR_IMAGES[1],
    specialty: "General Surgery",
    date: "2025-12-01",
    time: "6:00 AM",
    type: VISIT_TYPES.SURGERY,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400",
    address: "3000 Valley Road",
    phone: "+1-555-3000",
    notes: "Laparoscopic cholecystectomy (gallbladder removal).",
    estimatedDuration: "4 hours (including recovery)",
    summary: "Surgery completed without complications. 3 small incisions. Discharged same day with oral pain medication.",
    prescriptions: ["Norco 5/325 for pain", "Stool softener", "Follow-up in 2 weeks"],
    cost: "$12,000",
    insuranceCovered: true,
    roomNumber: "OR Suite 3",
    postOpRestrictions: ["No heavy lifting for 2 weeks", "Clear liquids then advance diet", "Keep incisions dry 48 hours"],
  },
  {
    id: "17",
    hospital: "Downtown Urgent Care",
    doctor: "Dr. Nicole Stevens",
    doctorImage: DOCTOR_IMAGES[5],
    specialty: "Urgent Care",
    date: "2025-11-25",
    time: "3:00 PM",
    type: VISIT_TYPES.CHECKUP,
    status: VISIT_STATUS.COMPLETED,
    image: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=400",
    address: "88 Market Street, Suite 100",
    phone: "+1-555-0088",
    notes: "Work physical for new job.",
    estimatedDuration: "45 mins",
    summary: "Physical exam within normal limits. Cleared for work. Hearing and vision tested - normal.",
    prescriptions: ["None"],
    cost: "$75",
    insuranceCovered: false,
    roomNumber: "Exam Room 1",
  },

  // ===== CANCELLED VISITS =====
  {
    id: "18",
    hospital: "Sunset Community Hospital",
    doctor: "Dr. George Murphy",
    doctorImage: DOCTOR_IMAGES[3],
    specialty: "Geriatrics",
    date: "2026-01-08",
    time: "1:00 PM",
    type: VISIT_TYPES.CHECKUP,
    status: VISIT_STATUS.CANCELLED,
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400",
    address: "600 Sunset Blvd",
    phone: "+1-555-0600",
    notes: "Annual wellness exam.",
    estimatedDuration: "1 hour",
    cancellationReason: "Patient requested reschedule due to transportation issues",
    cancellationDate: "2026-01-06",
    cost: "$0 (cancelled)",
    insuranceCovered: true,
    rescheduled: true,
    newAppointmentDate: "2026-01-22",
  },
  {
    id: "19",
    hospital: "Northgate Health Pavilion",
    doctor: "Dr. Sandra Lee",
    doctorImage: DOCTOR_IMAGES[0],
    specialty: "Dermatology",
    date: "2026-01-12",
    time: "11:00 AM",
    type: VISIT_TYPES.CONSULTATION,
    status: VISIT_STATUS.CANCELLED,
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400",
    address: "750 Northgate Drive",
    phone: "+1-555-0750",
    notes: "Skin check for moles.",
    estimatedDuration: "30 mins",
    cancellationReason: "Doctor unavailable - illness",
    cancellationDate: "2026-01-11",
    cost: "$0 (cancelled)",
    insuranceCovered: true,
    rescheduled: false,
  },

  // ===== IN PROGRESS (Today's visits) =====
  {
    id: "20",
    hospital: "Eastside Emergency Center",
    doctor: "Dr. Andrew Walsh",
    doctorImage: DOCTOR_IMAGES[2],
    specialty: "Emergency Medicine",
    date: "2026-01-08",
    time: "2:30 PM",
    type: VISIT_TYPES.EMERGENCY,
    status: VISIT_STATUS.IN_PROGRESS,
    image: "https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=400",
    address: "225 Eastside Plaza",
    phone: "+1-555-0225",
    notes: "Chest pain evaluation. Currently in observation.",
    estimatedDuration: "TBD",
    cost: "TBD",
    insuranceCovered: true,
    roomNumber: "ER Observation 12",
    currentStatus: "Awaiting cardiac enzyme results",
    lastUpdate: "2026-01-08T15:45:00",
  },

  // ===== MORE UPCOMING FOR VARIETY =====
  {
    id: "21",
    hospital: "Mission District Clinic",
    doctor: "Dr. Maria Gonzalez",
    doctorImage: DOCTOR_IMAGES[4],
    specialty: "Mental Health",
    date: "2026-02-25",
    time: "5:00 PM",
    type: VISIT_TYPES.THERAPY,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400",
    address: "333 Mission Street",
    phone: "+1-555-0333",
    notes: "Weekly therapy session - CBT for anxiety.",
    estimatedDuration: "50 mins",
    preparation: ["Complete weekly mood tracker"],
    cost: "$180",
    insuranceCovered: true,
    roomNumber: "Therapy Suite 2",
    sessionNumber: 8,
    totalSessions: 16,
  },
  {
    id: "22",
    hospital: "Regional Burn Center",
    doctor: "Dr. Steven Clark",
    doctorImage: DOCTOR_IMAGES[1],
    specialty: "Plastic Surgery",
    date: "2026-03-01",
    time: "9:00 AM",
    type: VISIT_TYPES.FOLLOWUP,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400",
    address: "1500 Recovery Road",
    phone: "+1-555-1500",
    notes: "Follow-up for burn wound healing assessment.",
    estimatedDuration: "45 mins",
    preparation: ["Do not apply any creams 24 hours before", "Wear loose clothing over affected area"],
    cost: "$300",
    insuranceCovered: true,
    roomNumber: "Burn Clinic 3",
  },
  {
    id: "23",
    hospital: "University Medical Center",
    doctor: "Dr. Elizabeth Moore",
    doctorImage: DOCTOR_IMAGES[0],
    specialty: "Oncology",
    date: "2026-03-05",
    time: "8:30 AM",
    type: VISIT_TYPES.PROCEDURE,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400",
    address: "100 University Ave, Medical Campus",
    phone: "+1-555-0100",
    notes: "PET scan for cancer staging.",
    estimatedDuration: "2 hours",
    preparation: ["Low carb diet 24 hours before", "No strenuous exercise 24 hours before", "Fasting 6 hours before"],
    cost: "$3,500",
    insuranceCovered: true,
    roomNumber: "Nuclear Medicine",
  },
  {
    id: "24",
    hospital: "Pacific Heart Institute",
    doctor: "Dr. John Mitchell",
    doctorImage: DOCTOR_IMAGES[3],
    specialty: "Cardiology",
    date: "2026-03-10",
    time: "11:00 AM",
    type: VISIT_TYPES.LAB_WORK,
    status: VISIT_STATUS.UPCOMING,
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400",
    address: "800 Heartbeat Way, Medical Row",
    phone: "+1-555-0800",
    notes: "Stress echocardiogram to evaluate heart function.",
    estimatedDuration: "1.5 hours",
    preparation: ["Wear comfortable shoes and clothes", "Avoid caffeine 24 hours before", "Light meal only"],
    cost: "$650",
    insuranceCovered: true,
    roomNumber: "Echo Lab 2",
  },
];

// Helper function to get status color
export const getStatusColor = (status) => {
  switch (status) {
    case VISIT_STATUS.UPCOMING:
      return "#3B82F6"; // Blue
    case VISIT_STATUS.IN_PROGRESS:
      return "#F59E0B"; // Amber
    case VISIT_STATUS.COMPLETED:
      return "#10B981"; // Green
    case VISIT_STATUS.CANCELLED:
      return "#EF4444"; // Red
    case VISIT_STATUS.RESCHEDULED:
      return "#8B5CF6"; // Purple
    case VISIT_STATUS.NO_SHOW:
      return "#6B7280"; // Gray
    default:
      return "#6B7280"; // Gray
  }
};

// Helper function to get visit type icon
export const getVisitTypeIcon = (type) => {
  switch (type) {
    case VISIT_TYPES.CHECKUP:
      return "fitness-outline";
    case VISIT_TYPES.FOLLOWUP:
      return "refresh-outline";
    case VISIT_TYPES.EMERGENCY:
      return "alert-circle-outline";
    case VISIT_TYPES.CONSULTATION:
      return "chatbubble-ellipses-outline";
    case VISIT_TYPES.PROCEDURE:
      return "medical-outline";
    case VISIT_TYPES.VACCINATION:
      return "bandage-outline";
    case VISIT_TYPES.LAB_WORK:
      return "flask-outline";
    case VISIT_TYPES.IMAGING:
      return "scan-outline";
    case VISIT_TYPES.THERAPY:
      return "heart-outline";
    case VISIT_TYPES.SURGERY:
      return "cut-outline";
    case VISIT_TYPES.TELEHEALTH:
      return "videocam-outline";
    default:
      return "calendar-outline";
  }
};

// Helper to get visit type color
export const getVisitTypeColor = (type) => {
  switch (type) {
    case VISIT_TYPES.CHECKUP:
      return "#10B981";
    case VISIT_TYPES.FOLLOWUP:
      return "#3B82F6";
    case VISIT_TYPES.EMERGENCY:
      return "#EF4444";
    case VISIT_TYPES.CONSULTATION:
      return "#8B5CF6";
    case VISIT_TYPES.PROCEDURE:
      return "#F59E0B";
    case VISIT_TYPES.VACCINATION:
      return "#EC4899";
    case VISIT_TYPES.LAB_WORK:
      return "#06B6D4";
    case VISIT_TYPES.IMAGING:
      return "#6366F1";
    case VISIT_TYPES.THERAPY:
      return "#F472B6";
    case VISIT_TYPES.SURGERY:
      return "#DC2626";
    case VISIT_TYPES.TELEHEALTH:
      return "#14B8A6";
    default:
      return "#6B7280";
  }
};

// Statistics helpers
export const getVisitStats = (visits) => {
  return {
    total: visits.length,
    upcoming: visits.filter(v => v.status === VISIT_STATUS.UPCOMING).length,
    completed: visits.filter(v => v.status === VISIT_STATUS.COMPLETED).length,
    cancelled: visits.filter(v => v.status === VISIT_STATUS.CANCELLED).length,
    inProgress: visits.filter(v => v.status === VISIT_STATUS.IN_PROGRESS).length,
  };
};

