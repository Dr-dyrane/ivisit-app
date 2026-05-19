export const SERVICE_PRICING_BASELINES = [
  {
    service_type: "ambulance",
    service_name: "Basic Life Support",
    base_price: 160,
    description: "Standard ambulance dispatch for urgent but stable transport.",
  },
  {
    service_type: "ambulance_advanced",
    service_name: "Advanced Life Support",
    base_price: 245,
    description:
      "Higher-acuity transport with advanced monitoring and intervention support.",
  },
  {
    service_type: "ambulance_critical",
    service_name: "Critical Care Transport",
    base_price: 360,
    description:
      "ICU-style transport for the highest-risk cases requiring continuous escalation capacity.",
  },
  {
    service_type: "bed",
    service_name: "Bed Reservation",
    base_price: 120,
    description: "Baseline for bed reservation",
  },
];

export const ROOM_PRICING_BASELINES = [
  {
    room_type: "general",
    room_name: "General Ward",
    price_per_night: 140,
    description: "Baseline room pricing",
  },
  {
    room_type: "private",
    room_name: "Private Room",
    price_per_night: 260,
    description: "Private room baseline",
  },
];

export const ensureDemoPricing = async (admin: any, hospitals: any[]) => {
  for (const hospital of hospitals) {
    for (const baseline of SERVICE_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_service_pricing", {
        payload: {
          hospital_id: hospital.id,
          service_type: baseline.service_type,
          service_name: baseline.service_name,
          base_price: baseline.base_price,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`service pricing upsert failed: ${error.message}`);
      }
    }

    for (const baseline of ROOM_PRICING_BASELINES) {
      const { error } = await admin.rpc("upsert_room_pricing", {
        payload: {
          hospital_id: hospital.id,
          room_type: baseline.room_type,
          room_name: baseline.room_name,
          price_per_night: baseline.price_per_night,
          description: baseline.description,
        },
      });
      if (error) {
        throw new Error(`room pricing upsert failed: ${error.message}`);
      }
    }
  }

  return {
    hospitals_priced: hospitals.length,
    service_pricing_rows_expected:
      hospitals.length * SERVICE_PRICING_BASELINES.length,
    room_pricing_rows_expected:
      hospitals.length * ROOM_PRICING_BASELINES.length,
  };
};
