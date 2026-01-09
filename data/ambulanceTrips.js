export const AMBULANCE_TRIP_STATUS = {
	REQUESTED: "requested",
	DISPATCHED: "dispatched",
	ARRIVED: "arrived",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
};

export const AMBULANCE_TRIPS = [
	{
		id: "ride_1001",
		requestId: "ride_1001",
		hospitalId: "1",
		ambulanceId: "amb_01",
		ambulanceType: "ALS",
		etaSeconds: 420,
		status: AMBULANCE_TRIP_STATUS.DISPATCHED,
		createdAt: "2026-01-08T18:12:00.000Z",
	},
	{
		id: "ride_1002",
		requestId: "ride_1002",
		hospitalId: "3",
		ambulanceId: "amb_07",
		ambulanceType: "BLS",
		etaSeconds: 0,
		status: AMBULANCE_TRIP_STATUS.COMPLETED,
		createdAt: "2026-01-06T21:05:00.000Z",
	},
	{
		id: "ride_1003",
		requestId: "ride_1003",
		hospitalId: "4",
		ambulanceId: "amb_03",
		ambulanceType: "BLS",
		etaSeconds: 0,
		status: AMBULANCE_TRIP_STATUS.CANCELLED,
		createdAt: "2026-01-07T10:18:00.000Z",
	},
];

