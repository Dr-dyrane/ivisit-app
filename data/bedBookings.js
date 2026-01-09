export const BED_BOOKING_STATUS = {
	RESERVED: "reserved",
	READY: "ready",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
};

export const BED_BOOKINGS = [
	{
		id: "bed_2001",
		requestId: "bed_2001",
		hospitalId: "2",
		specialty: "Cardiology",
		bedNumber: "B-12",
		bedType: "ICU",
		bedCount: 1,
		estimatedWait: "12 mins",
		status: BED_BOOKING_STATUS.RESERVED,
		createdAt: "2026-01-08T14:40:00.000Z",
	},
	{
		id: "bed_2002",
		requestId: "bed_2002",
		hospitalId: "8",
		specialty: "Pediatrics",
		bedNumber: "P-03",
		bedType: "Pediatric",
		bedCount: 1,
		estimatedWait: "0 mins",
		status: BED_BOOKING_STATUS.READY,
		createdAt: "2026-01-08T09:05:00.000Z",
	},
	{
		id: "bed_2003",
		requestId: "bed_2003",
		hospitalId: "11",
		specialty: "Oncology",
		bedNumber: "ONC-22",
		bedType: "General",
		bedCount: 1,
		estimatedWait: "30 mins",
		status: BED_BOOKING_STATUS.CANCELLED,
		createdAt: "2026-01-07T16:10:00.000Z",
	},
];

