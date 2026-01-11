import { forwardRef, useCallback } from "react";
import EmergencyBottomSheet from "./EmergencyBottomSheet";

export const BottomSheetController = forwardRef((props, ref) => {
	const {
		mode,
		serviceType,
		selectedSpecialty,
		specialties,
		hospitals,
		allHospitals,
		selectedHospital,
		isRequestMode,
		requestHospital,
		onRequestClose,
		onRequestInitiated,
		onRequestComplete,
		activeAmbulanceTrip,
		activeBedBooking,
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
		onModeSelect,
		serviceTypeCounts,
		specialtyCounts,
		hasActiveFilters,
		onServiceTypeSelect,
		onSpecialtySelect,
		onHospitalSelect,
		onHospitalCall,
		onSnapChange,
		onSearch,
		onResetFilters,
		onCloseFocus,
	} = props;

	const handleSheetSnap = useCallback(
		(index) => {
			// Derive max index dynamically and validate before snapping
			const maxIndex = Math.max(0, (ref.current?.snapPoints?.length ?? 3) - 1);
			const safeIndex = Math.min(Math.max(0, index), maxIndex);
			ref.current?.snapToIndex?.(safeIndex);
		},
		[ref]
	);

	const wrappedOnCancelAmbulanceTrip = useCallback(async () => {
		await onCancelAmbulanceTrip?.();
		// Use dynamic index instead of hard-coded 1
		const maxIndex = Math.max(0, (ref.current?.snapPoints?.length ?? 3) - 1);
		const targetIndex = Math.min(maxIndex, 1);
		handleSheetSnap(targetIndex);
	}, [onCancelAmbulanceTrip, handleSheetSnap, ref]);

	const wrappedOnCompleteAmbulanceTrip = useCallback(async () => {
		await onCompleteAmbulanceTrip?.();
		// Use dynamic index instead of hard-coded 1
		const maxIndex = Math.max(0, (ref.current?.snapPoints?.length ?? 3) - 1);
		const targetIndex = Math.min(maxIndex, 1);
		handleSheetSnap(targetIndex);
	}, [onCompleteAmbulanceTrip, handleSheetSnap, ref]);

	const wrappedOnCancelBedBooking = useCallback(async () => {
		await onCancelBedBooking?.();
		// Use dynamic index instead of hard-coded 1
		const maxIndex = Math.max(0, (ref.current?.snapPoints?.length ?? 3) - 1);
		const targetIndex = Math.min(maxIndex, 1);
		handleSheetSnap(targetIndex);
	}, [onCancelBedBooking, handleSheetSnap, ref]);

	const wrappedOnCompleteBedBooking = useCallback(async () => {
		await onCompleteBedBooking?.();
		// Use dynamic index instead of hard-coded 1
		const maxIndex = Math.max(0, (ref.current?.snapPoints?.length ?? 3) - 1);
		const targetIndex = Math.min(maxIndex, 1);
		handleSheetSnap(targetIndex);
	}, [onCompleteBedBooking, handleSheetSnap, ref]);

	return (
		<EmergencyBottomSheet
			ref={ref}
			mode={mode}
			serviceType={serviceType}
			selectedSpecialty={selectedSpecialty}
			specialties={specialties}
			hospitals={hospitals}
			allHospitals={allHospitals}
			selectedHospital={selectedHospital}
			isRequestMode={isRequestMode}
			requestHospital={requestHospital}
			onRequestClose={onRequestClose}
			onRequestInitiated={onRequestInitiated}
			onRequestComplete={onRequestComplete}
			activeAmbulanceTrip={activeAmbulanceTrip}
			activeBedBooking={activeBedBooking}
			onCancelAmbulanceTrip={wrappedOnCancelAmbulanceTrip}
			onMarkAmbulanceArrived={onMarkAmbulanceArrived}
			onCompleteAmbulanceTrip={wrappedOnCompleteAmbulanceTrip}
			onCancelBedBooking={wrappedOnCancelBedBooking}
			onMarkBedOccupied={onMarkBedOccupied}
			onCompleteBedBooking={wrappedOnCompleteBedBooking}
			onModeSelect={onModeSelect}
			serviceTypeCounts={serviceTypeCounts}
			specialtyCounts={specialtyCounts}
			hasActiveFilters={hasActiveFilters}
			onServiceTypeSelect={onServiceTypeSelect}
			onSpecialtySelect={onSpecialtySelect}
			onHospitalSelect={onHospitalSelect}
			onHospitalCall={onHospitalCall}
			onSnapChange={onSnapChange}
			onSearch={onSearch}
			onResetFilters={onResetFilters}
			onCloseFocus={onCloseFocus}
		/>
	);
});

BottomSheetController.displayName = "BottomSheetController";
