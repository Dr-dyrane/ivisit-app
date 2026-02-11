import { useEffect } from "react";
import { supabase } from "../../services/supabase";
import { parsePoint } from "../../services/emergency/locationUtils";

export const useEmergencySubscription = ({ setActiveBedBooking, setActiveAmbulanceTrip }) => {
    useEffect(() => {
        let subscription;
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            subscription = supabase
                .channel('emergency_updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'emergency_requests',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newRecord = payload.new;
                        
                        // Handle Bed Booking Updates
                        setActiveBedBooking((prev) => {
                            if (!prev || prev.requestId !== newRecord.request_id) return prev;
                            if (newRecord.status === "completed" || newRecord.status === "cancelled") {
                                return null;
                            }
                            return {
                                ...prev,
                                status: newRecord.status,
                                hospitalId: newRecord.hospital_id ?? prev.hospitalId,
                                hospitalName: newRecord.hospital_name ?? prev.hospitalName,
                                specialty: newRecord.specialty ?? prev.specialty,
                                bedNumber: newRecord.bed_number ?? prev.bedNumber,
                                bedType: newRecord.bed_type ?? prev.bedType,
                                bedCount: newRecord.bed_count ?? prev.bedCount,
                                estimatedWait: newRecord.estimated_arrival ?? prev.estimatedWait,
                            };
                        });

                        // Handle Ambulance Updates
                        setActiveAmbulanceTrip((prev) => {
                            if (!prev || prev.requestId !== newRecord.request_id) return prev;
                            if (newRecord.status === "completed" || newRecord.status === "cancelled") {
                                return null;
                            }
                            const loc = parsePoint(newRecord.responder_location);
                            const prevAssigned = prev?.assignedAmbulance ?? null;
                            const hasResponder = !!newRecord.responder_name;
                            const mergedAssigned = hasResponder
                                ? {
                                    ...(prevAssigned && typeof prevAssigned === "object" ? prevAssigned : {}),
                                    id: newRecord.ambulance_id || prevAssigned?.id || "ems_001",
                                    type: newRecord.responder_vehicle_type || prevAssigned?.type || "Ambulance",
                                    plate: newRecord.responder_vehicle_plate || prevAssigned?.plate,
                                    name: newRecord.responder_name || prevAssigned?.name,
                                    phone: newRecord.responder_phone || prevAssigned?.phone,
                                    location: loc || prevAssigned?.location,
                                    heading: Number.isFinite(newRecord.responder_heading) ? newRecord.responder_heading : prevAssigned?.heading || 0,
                                }
                                : prevAssigned;

                            return {
                                ...prev,
                                status: newRecord.status,
                                assignedAmbulance: mergedAssigned,
                                currentResponderLocation: loc || prev.currentResponderLocation,
                                currentResponderHeading: Number.isFinite(newRecord.responder_heading) ? newRecord.responder_heading : prev.currentResponderHeading,
                            };
                        });
                    }
                )
                .subscribe();
        };
        setupSubscription();
        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, []);
};
