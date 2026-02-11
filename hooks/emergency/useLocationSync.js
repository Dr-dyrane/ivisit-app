import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";

export const useLocationSync = (activeAmbulanceTrip) => {
    const [userLocation, setUserLocation] = useState(null);

    // Fetch Initial Location
    useEffect(() => {
        (async () => {
            try {
                const lastKnown = await Location.getLastKnownPositionAsync({});
                if (lastKnown) {
                    setUserLocation({
                        latitude: lastKnown.coords.latitude,
                        longitude: lastKnown.coords.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    });
                }

                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    });
                }
            } catch (e) {
                console.log("Context location fetch failed (using fallback):", e);
                setUserLocation({
                    latitude: 33.7475,
                    longitude: -116.9730,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                });
            }
        })();
    }, []);

    // Sync User Location to Server during Active Trip
    useEffect(() => {
        if (!activeAmbulanceTrip || !activeAmbulanceTrip.requestId) return;
        if (activeAmbulanceTrip.status === 'completed' || activeAmbulanceTrip.status === 'cancelled') return;

        let locationSubscription = null;
        (async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;

                locationSubscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 10000 },
                    (location) => {
                        const { latitude, longitude, heading } = location.coords;
                        setUserLocation(prev => ({ ...prev, latitude, longitude }));
                        emergencyRequestsService.updateLocation(activeAmbulanceTrip.requestId, `POINT(${longitude} ${latitude})`, heading || 0);
                    }
                );
            } catch (e) {
                console.warn("Location tracking failed:", e);
            }
        })();
        return () => { if (locationSubscription) locationSubscription.remove(); };
    }, [activeAmbulanceTrip?.requestId, activeAmbulanceTrip?.status]);

    return { userLocation, setUserLocation };
};
