import { useState, useRef, useCallback, useMemo } from "react";
import { Animated, Alert, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { format, startOfToday, addDays } from "date-fns";
import { useVisits } from "../../contexts/VisitsContext";
import { VISIT_STATUS, VISIT_TYPES } from "../../constants/visits";
import { serviceCostService } from "../../services/serviceCostService";
import { paymentService } from "../../services/paymentService";
import { useAuth } from "../../contexts/AuthContext";
import { useEmergency } from "../../contexts/EmergencyContext";
import { demoEcosystemService } from "../../services/demoEcosystemService";

export const STEPS = {
	SERVICE: 0,
	SPECIALTY: 1,
	PROVIDER: 2,
	DATETIME: 3,
	SUMMARY: 4,
};

// Mock doctors database (could be moved to a service or constant file)
export const DOCTOR_NAMES = [
	"Dr. Sarah Wilson", "Dr. James Chen", "Dr. Emily Rodriguez",
	"Dr. Michael Chang", "Dr. Lisa Thompson", "Dr. David Kim",
	"Dr. Rachel Foster", "Dr. Robert Patel"
];

export const TIME_SLOTS = [
	"09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
	"11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM",
	"02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
	"04:00 PM", "04:30 PM"
];

export function useBookVisit(props = {}) {
	// PULLBACK NOTE: Pass 12 F3 - accept onSuccess + onCancel for map-owned booking sheet
	// OLD: submit always router.replace("/(user)/(stacks)/visit/${id}")
	// NEW: if onSuccess is provided, invoke it with the created visit; else fall back to router.replace
	// PULLBACK NOTE: null-safe initialData (destructure default only handles undefined)
	// OLD: const { initialData = {}, onSuccess = null } = props;
	// NEW: normalize null -> {} so callers can pass null for "no pre-fill"
	const { initialData: rawInitialData, onSuccess = null } = props;
	const initialData = rawInitialData || {};
	const { user } = useAuth();
	const { allHospitals, effectiveDemoModeEnabled } = useEmergency();
	const router = useRouter();
	const { addVisit } = useVisits();
	const hospitals = Array.isArray(allHospitals) ? allHospitals : [];

	const safeParse = (val) => {
		if (!val) return null;
		if (typeof val === 'object') return val;
		try { return JSON.parse(val); } catch (e) { return val; }
	};

	// Wizard State
	const [step, setStep] = useState(initialData.step ? parseInt(initialData.step) : STEPS.SERVICE);
	const [bookingData, setBookingData] = useState({
		type: initialData.type || null, // 'clinic' | 'telehealth'
		specialty: initialData.specialty || null,
		hospital: safeParse(initialData.hospital),
		doctor: safeParse(initialData.doctor),
		date: initialData.date ? new Date(initialData.date) : null,
		time: initialData.time || null,
		notes: initialData.notes || "",
	});
	const [cost, setCost] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Modal States
	const [specialtySearchVisible, setSpecialtySearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [providerModalVisible, setProviderModalVisible] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState(null);

	// Animation refs
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const slideAnim = useRef(new Animated.Value(0)).current;

	const animateTransition = useCallback((callback) => {
		Animated.parallel([
			Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
			Animated.timing(slideAnim, { toValue: 20, duration: 200, useNativeDriver: true })
		]).start(() => {
			callback();
			slideAnim.setValue(20);
			Animated.parallel([
				Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
				Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true })
			]).start();
		});
	}, [fadeAnim, slideAnim]);

	const goToStep = useCallback((nextStep) => {
		Haptics.selectionAsync();
		animateTransition(() => setStep(nextStep));
	}, [animateTransition]);

	const updateData = useCallback((key, value) => {
		setBookingData(prev => ({ ...prev, [key]: value }));
	}, []);

	// Back button logic with proper step navigation
	const handleBack = useCallback(() => {
		Haptics.selectionAsync();

		if (step === STEPS.SERVICE) {
			// First step - go back to previous screen
			router.back();
		} else if (step === STEPS.SPECIALTY) {
			// Go back to service selection
			animateTransition(() => setStep(STEPS.SERVICE));
		} else if (step === STEPS.PROVIDER) {
			// Go back to specialty selection
			animateTransition(() => setStep(STEPS.SPECIALTY));
		} else if (step === STEPS.DATETIME) {
			// Go back to provider selection, but handle telehealth case
			animateTransition(() => {
				if (bookingData.type === 'telehealth') {
					// For telehealth, skip provider selection and go to service
					setStep(STEPS.SERVICE);
				} else {
					// For clinic visits, go back to provider selection
					setStep(STEPS.PROVIDER);
				}
			});
		} else if (step === STEPS.SUMMARY) {
			// Go back to date/time selection
			animateTransition(() => setStep(STEPS.DATETIME));
		}
	}, [step, bookingData.type, router, animateTransition]);

	// --- Step 1: Service Selection ---
	const handleSelectService = useCallback((type) => {
		updateData('type', type);
		if (type === 'telehealth') {
			// Auto-fill telehealth defaults
			setBookingData(prev => ({
				...prev,
				type,
				specialty: 'General Practice',
				hospital: { name: 'iVisit Telehealth', address: 'Virtual Visit', image: null },
				doctor: { name: 'Dr. On-Call', image: null },
			}));
			goToStep(STEPS.DATETIME);
		} else {
			goToStep(STEPS.SPECIALTY);
		}
	}, [updateData, goToStep]);

	// --- Step 2: Specialty Selection ---
	const specialties = useMemo(() => {
		const all = new Set();
		hospitals.forEach(h => {
			if (h.specialties) h.specialties.forEach(s => all.add(s));
		});
		return Array.from(all).sort();
	}, [hospitals]);

	const filteredSpecialties = useMemo(() => {
		if (!searchQuery) return specialties;
		return specialties.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
	}, [specialties, searchQuery]);

	const handleSelectSpecialty = useCallback((s) => {
		updateData('specialty', s);
		setSpecialtySearchVisible(false);
		setSearchQuery("");
		goToStep(STEPS.PROVIDER);
	}, [updateData, goToStep]);

	// --- Step 3: Provider Selection ---
	const availableProviders = useMemo(() => {
		if (!bookingData.specialty) return [];
		return hospitals.filter(h => h.specialties?.includes(bookingData.specialty));
	}, [hospitals, bookingData.specialty]);

	const handleProviderSelect = useCallback((hospital) => {
		// Mock picking a doctor from this hospital
		const randomDoc = DOCTOR_NAMES[Math.floor(Math.random() * DOCTOR_NAMES.length)];
		const providerData = {
			...hospital,
			doctorName: randomDoc,
			bio: `Specialist in ${bookingData.specialty} with over 10 years of experience. Dedicated to providing patient-centered care.`,
			rating: 4.9,
			reviews: 124,
			nextAvailable: "Today, 2:00 PM"
		};
		setSelectedProvider(providerData);
		setProviderModalVisible(true);
	}, [bookingData.specialty]);

	const confirmProviderSelection = useCallback(() => {
		if (!selectedProvider) return;
		updateData('hospital', selectedProvider);
		updateData('doctor', { name: selectedProvider.doctorName, image: null });
		setProviderModalVisible(false);
		goToStep(STEPS.DATETIME);
	}, [selectedProvider, updateData, goToStep]);

	// --- Step 4: Date & Time ---
	const dates = useMemo(() => {
		const today = startOfToday();
		return Array.from({ length: 14 }).map((_, i) => addDays(today, i + 1));
	}, []);

	const handleSelectDate = useCallback((date) => updateData('date', date), [updateData]);
	const handleSelectTime = useCallback((time) => updateData('time', time), [updateData]);
	const isDemoBookingFlow = useMemo(
		() =>
			demoEcosystemService.isDemoFlowActive({
				hospital: bookingData.hospital,
				demoModeEnabled: effectiveDemoModeEnabled,
			}),
		[bookingData.hospital, effectiveDemoModeEnabled]
	);

	const handleConfirmDateTime = useCallback(async () => {
		if (bookingData.date && bookingData.time) {
			goToStep(STEPS.SUMMARY);

			// Fetch real cost for summary
			try {
				const costData = await serviceCostService.calculateEmergencyCost(
					'consultation',
					{
						hospitalId: bookingData.hospital?.id,
						isUrgent: false
					}
				);
				setCost(costData);
			} catch (err) {
				console.error("Failed to fetch cost", err);
			}
		} else {
			Alert.alert("Required", "Please select both a date and time.");
		}
	}, [bookingData.date, bookingData.time, bookingData.hospital?.id, goToStep]);

	// --- Step 5: Final Submission ---
	const handleBookVisit = useCallback(async () => {
		try {
			setIsSubmitting(true);

			// Financial Guardrail: Check Cash Eligibility if needed
			if (!isDemoBookingFlow && bookingData.hospital?.organizationId && cost?.total_cost) {
				const isEligible = await paymentService.checkCashEligibility(
					bookingData.hospital.organizationId,
					cost.total_cost
				);

				if (!isEligible) {
					throw new Error("Financial guardrail: Organization not eligible for cash payment collateral.");
				}
			}

			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

			const id = `visit_${Date.now()}`;
			const visit = {
				id,
				hospital: bookingData.hospital.name,
				doctor: bookingData.doctor.name,
				doctorImage: bookingData.doctor.image,
				specialty: bookingData.specialty,
				date: format(bookingData.date, 'yyyy-MM-dd'),
				time: bookingData.time,
				type: bookingData.type === 'telehealth' ? VISIT_TYPES.TELEHEALTH : VISIT_TYPES.CONSULTATION,
				status: VISIT_STATUS.UPCOMING,
				image: bookingData.hospital.image,
				address: bookingData.hospital.address,
				phone: bookingData.hospital.phone || "+1-555-0123",
				notes: bookingData.notes || (bookingData.type === 'telehealth' ? "Virtual consult." : "In-person appointment."),
				estimatedDuration: bookingData.type === 'telehealth' ? "20 mins" : "45 mins",
				meetingLink: bookingData.type === 'telehealth' ? "https://telehealth.ivisit.com/room/demo" : null,
				cost: cost?.total_cost ? `$${cost.total_cost.toFixed(2)}` : null
			};

			await addVisit(visit);

			// PULLBACK NOTE: Pass 12 F3 - prefer onSuccess callback over legacy route redirect
			if (typeof onSuccess === "function") {
				onSuccess(visit);
			} else {
				// Legacy route fallback (VisitDetailsScreen is now a bridge to /(user))
				router.replace(`/(user)/(stacks)/visit/${id}`);
			}

		} catch (error) {
			console.error("Booking failed", error);
			Alert.alert("Error", "Failed to book visit. Please try again.");
			setIsSubmitting(false);
		}
	}, [addVisit, bookingData, cost?.total_cost, isDemoBookingFlow, onSuccess, router]);

	return {
		step,
		bookingData,
		isSubmitting,
		fadeAnim,
		slideAnim,
		specialties,
		filteredSpecialties,
		availableProviders,
		dates,
		specialtySearchVisible,
		setSpecialtySearchVisible,
		searchQuery,
		setSearchQuery,
		providerModalVisible,
		setProviderModalVisible,
		selectedProvider,

		handleBack,
		handleSelectService,
		handleSelectSpecialty,
		handleProviderSelect,
		confirmProviderSelection,
		handleSelectDate,
		handleSelectTime,
		handleConfirmDateTime,
		handleBookVisit
	};
}
