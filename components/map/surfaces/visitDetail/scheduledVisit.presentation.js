const SCHEDULED_SOURCE_KIND = "scheduled_visit";
const ASYNC_CONSULT_MODE = "telemedicine_async";

const toKey = (value) =>
	typeof value === "string" ? value.trim().toLowerCase() : "";

const readLifecycleState = (historyItem) => {
	const explicitState = toKey(
		historyItem?.lifecycleState ||
			historyItem?.visit?.lifecycleState ||
			historyItem?.visit?.lifecycle_state,
	);
	if (explicitState) return explicitState;

	switch (toKey(historyItem?.status)) {
		case "active":
			return "in_progress";
		case "completed":
			return "completed";
		case "cancelled":
			return "cancelled";
		default:
			return "scheduled";
	}
};

const buildSteps = ({ state, careLabel }) => {
	if (state === "completed") {
		return [
			{ key: "scheduled", label: "Scheduled", state: "complete" },
			{ key: "care", label: careLabel, state: "complete" },
			{ key: "complete", label: "Complete", state: "complete" },
		];
	}

	if (state === "in_progress") {
		return [
			{ key: "scheduled", label: "Scheduled", state: "complete" },
			{ key: "care", label: careLabel, state: "current" },
			{ key: "complete", label: "Complete", state: "upcoming" },
		];
	}

	if (state === "cancelled" || state === "no_show") {
		return [
			{ key: "scheduled", label: "Scheduled", state: "complete" },
			{
				key: "care",
				label: state === "no_show" ? "Missed" : "Cancelled",
				state: "terminal",
			},
			{ key: "complete", label: "Complete", state: "upcoming" },
		];
	}

	return [
		{
			key: "scheduled",
			label: state === "rescheduled" ? "Rescheduled" : "Scheduled",
			state: "current",
		},
		{ key: "care", label: careLabel, state: "upcoming" },
		{ key: "complete", label: "Complete", state: "upcoming" },
	];
};

export const buildScheduledVisitLifecycle = (historyItem) => {
	if (historyItem?.sourceKind !== SCHEDULED_SOURCE_KIND) return null;

	const state = readLifecycleState(historyItem);
	const isAsyncConsult = toKey(historyItem?.careMode) === ASYNC_CONSULT_MODE;
	const careLabel = isAsyncConsult ? "Consult" : "Visit";
	const presentationByState = {
		scheduled: {
			statusLabel: "Scheduled",
			statusTone: "accent",
			nextLabel: isAsyncConsult
				? "Next: open your consult"
				: "Next: arrive for your visit",
			progressValue: 0,
			icon: "calendar-outline",
		},
		rescheduled: {
			statusLabel: "Rescheduled",
			statusTone: "accent",
			nextLabel: isAsyncConsult
				? "Next: open your consult"
				: "Next: arrive at the new time",
			progressValue: 0,
			icon: "calendar-outline",
		},
		in_progress: {
			statusLabel: "In progress",
			statusTone: "accent",
			nextLabel: isAsyncConsult ? "Consult in progress" : "Visit in progress",
			progressValue: 0.5,
			icon: "pulse-outline",
		},
		completed: {
			statusLabel: "Completed",
			statusTone: "success",
			nextLabel: "Visit complete",
			progressValue: 1,
			icon: "checkmark-circle-outline",
		},
		cancelled: {
			statusLabel: "Cancelled",
			statusTone: "danger",
			nextLabel: "Choose another time when ready",
			progressValue: 0,
			icon: "close-circle-outline",
		},
		no_show: {
			statusLabel: "Missed",
			statusTone: "warning",
			nextLabel: "Choose another time when ready",
			progressValue: 0,
			icon: "alert-circle-outline",
		},
	};
	const presentation = presentationByState[state] || presentationByState.scheduled;

	return {
		state,
		title: "Visit progress",
		careLabel,
		isAsyncConsult,
		isTerminal: state === "completed" || state === "cancelled" || state === "no_show",
		steps: buildSteps({ state, careLabel }),
		...presentation,
	};
};

const action = ({
	key,
	label,
	icon,
	activeIcon,
	onPress,
}) => ({
	key,
	label,
	icon,
	activeIcon,
	iconType: "ion",
	activeIconType: "ion",
	onPress,
	disabled: false,
	accessibilityLabel: label,
});

export const buildScheduledVisitPlaceActions = ({
	historyItem,
	lifecycle,
	canOpenConsult,
	canCall,
	canReschedule,
	canDirections,
	canBookAgain,
	onOpenConsult,
	onCallClinic,
	onReschedule,
	onGetDirections,
	onBookAgain,
}) => {
	if (historyItem?.sourceKind !== SCHEDULED_SOURCE_KIND) return null;

	const items = [];
	const isAsyncConsult = Boolean(lifecycle?.isAsyncConsult);
	const isInProgress = lifecycle?.state === "in_progress";
	const isTerminal = Boolean(lifecycle?.isTerminal);

	const pushConsult = () => {
		if (!canOpenConsult) return;
		items.push(
			action({
				key: "consult",
				label: isTerminal ? "View consult" : "Open consult",
				icon: "chatbubbles-outline",
				activeIcon: "chatbubbles",
				onPress: onOpenConsult,
			}),
		);
	};
	const pushCall = () => {
		if (!canCall) return;
		items.push(
			action({
				key: "call",
				label: "Call",
				icon: "call-outline",
				activeIcon: "call",
				onPress: onCallClinic,
			}),
		);
	};
	const pushDirections = () => {
		if (!canDirections) return;
		items.push(
			action({
				key: "directions",
				label: "Directions",
				icon: "navigate-outline",
				activeIcon: "navigate",
				onPress: onGetDirections,
			}),
		);
	};
	const pushReschedule = () => {
		if (!canReschedule) return;
		items.push(
			action({
				key: "reschedule",
				label: "Reschedule",
				icon: "calendar-outline",
				activeIcon: "calendar",
				onPress: onReschedule,
			}),
		);
	};

	if (isTerminal) {
		if (canBookAgain) {
			items.push(
				action({
					key: "bookAgain",
					label: "Book again",
					icon: "repeat-outline",
					activeIcon: "repeat",
					onPress: onBookAgain,
				}),
			);
		}
		if (isAsyncConsult) pushConsult();
		pushCall();
	} else if (isAsyncConsult) {
		pushConsult();
		pushCall();
		pushReschedule();
	} else if (isInProgress) {
		pushCall();
		pushDirections();
	} else {
		pushDirections();
		pushCall();
		pushReschedule();
	}

	return items.slice(0, 4).map((item, index) => ({
		...item,
		primary: index === 0,
	}));
};
