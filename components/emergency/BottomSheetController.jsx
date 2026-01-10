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
		activeAmbulanceTrip,
		activeBedBooking,
		onCancelAmbulanceTrip,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onCompleteBedBooking,
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
			ref.current?.snapToIndex?.(index);
		},
		[ref]
	);

	const wrappedOnCancelAmbulanceTrip = useCallback(async () => {
		await onCancelAmbulanceTrip?.();
		handleSheetSnap(1);
	}, [onCancelAmbulanceTrip, handleSheetSnap]);

	const wrappedOnCompleteAmbulanceTrip = useCallback(async () => {
		await onCompleteAmbulanceTrip?.();
		handleSheetSnap(1);
	}, [onCompleteAmbulanceTrip, handleSheetSnap]);

	const wrappedOnCancelBedBooking = useCallback(async () => {
		await onCancelBedBooking?.();
		handleSheetSnap(1);
	}, [onCancelBedBooking, handleSheetSnap]);

	const wrappedOnCompleteBedBooking = useCallback(async () => {
		await onCompleteBedBooking?.();
		handleSheetSnap(1);
	}, [onCompleteBedBooking, handleSheetSnap]);

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
			activeAmbulanceTrip={activeAmbulanceTrip}
			activeBedBooking={activeBedBooking}
			onCancelAmbulanceTrip={wrappedOnCancelAmbulanceTrip}
			onCompleteAmbulanceTrip={wrappedOnCompleteAmbulanceTrip}
			onCancelBedBooking={wrappedOnCancelBedBooking}
			onCompleteBedBooking={wrappedOnCompleteBedBooking}
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
