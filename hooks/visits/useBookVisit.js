import { useState, useRef, useCallback, useMemo } from "react";
import { Animated, Alert, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { format, startOfToday, addDays } from "date-fns";
import { useVisits } from "../../contexts/VisitsContext";
import { VISIT_STATUS, VISIT_TYPES } from "../../constants/visits";
import { useHospitals } from "../../hooks/emergency/useHospitals";

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

export function useBookVisit() {
	const router = useRouter();
	const { addVisit } = useVisits();
	const { hospitals } = useHospitals();

	// Wizard State
	const [step, setStep] = useState(STEPS.SERVICE);
	const [bookingData, setBookingData] = useState({
		type: null, // 'clinic' | 'telehealth'
		specialty: null,
		hospital: null,
		doctor: null,
		date: null,
		time: null,
		notes: "",
	});
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

	// Back button logic
	const handleBack = useCallback(() => {
		if (step === STEPS.SERVICE) {
			router.back();
		} else {
			animateTransition(() => {
				setStep((prev) => {
					if (prev === STEPS.DATETIME && bookingData.type === 'telehealth') {
						return STEPS.SERVICE;
					}
					return prev - 1;
				});
			});
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
	
	const handleConfirmDateTime = useCallback(() => {
		if (bookingData.date && bookingData.time) {
			goToStep(STEPS.SUMMARY);
		} else {
			Alert.alert("Required", "Please select both a date and time.");
		}
	}, [bookingData.date, bookingData.time, goToStep]);

	// --- Step 5: Final Submission ---
	const handleBookVisit = useCallback(async () => {
		try {
			setIsSubmitting(true);
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
			};

			await addVisit(visit);
			
			// Replace with visit details
			router.replace(`/(user)/(stacks)/visit/${id}`);
			
		} catch (error) {
			console.error("Booking failed", error);
			Alert.alert("Error", "Failed to book visit. Please try again.");
			setIsSubmitting(false);
		}
	}, [bookingData, addVisit, router]);

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
