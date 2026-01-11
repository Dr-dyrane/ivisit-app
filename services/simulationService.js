import { supabase } from "./supabase";

/**
 * SIMULATION SERVICE
 * 
 * In a real app, this logic lives on the Backend (Dispatch Server).
 * Since we don't have a backend worker, we simulate the "Driver" 
 * by updating the database from the client side, but decoupled from the UI.
 * 
 * This ensures the UI only reacts to Database changes, not local state.
 */

export const simulationService = {
    activeSimulationId: null,
    timerId: null,

    /**
     * Start simulating a driver for a specific request
     * @param {string} requestId 
     * @param {Array} routeCoordinates - Path for the driver to follow
     */
    async startSimulation(requestId, routeCoordinates) {
        if (this.activeSimulationId === requestId) return;
        this.stopSimulation(); // Clear any previous
        
        this.activeSimulationId = requestId;
        console.log(`[Simulation] Starting dispatch for ${requestId}`);

        // Step 1: Wait 5s, then "Accept" the request
        setTimeout(async () => {
            if (this.activeSimulationId !== requestId) return;
            
            console.log(`[Simulation] Driver Accepted`);
            
            const { error } = await supabase
                .from('emergency_requests')
                .update({
                    status: 'accepted',
                    responder_name: "John Doe",
                    responder_phone: "+15550109988",
                    responder_vehicle_type: "advanced",
                    responder_vehicle_plate: "EMS-998",
                    responder_heading: 0,
                    // Start at the beginning of the route (hospital)
                    responder_location: routeCoordinates && routeCoordinates.length > 0 
                        ? `POINT(${routeCoordinates[0].longitude} ${routeCoordinates[0].latitude})`
                        : null
                })
                .eq('id', requestId);

            if (error) console.error("[Simulation] Accept Error", error);

            // Step 2: Start Driving
            if (routeCoordinates && routeCoordinates.length > 1) {
                this.startDriving(requestId, routeCoordinates);
            }
        }, 5000);
    },

    startDriving(requestId, route) {
        let step = 0;
        // Drive the route in ~30 seconds (skipping points)
        // If route has 100 points, we want to finish in 30s. 30s / 2s interval = 15 updates.
        // So step increment = length / 15.
        const totalSteps = 20;
        const increment = Math.ceil(route.length / totalSteps);
        
        this.timerId = setInterval(async () => {
            if (this.activeSimulationId !== requestId) {
                this.stopSimulation();
                return;
            }

            step += increment;
            
            // Arrival Check
            if (step >= route.length - 1) {
                console.log(`[Simulation] Driver Arrived`);
                await supabase
                    .from('emergency_requests')
                    .update({
                        status: 'arrived',
                        responder_location: `POINT(${route[route.length-1].longitude} ${route[route.length-1].latitude})`
                    })
                    .eq('id', requestId);
                this.stopSimulation();
                return;
            }

            // Update Position
            const point = route[step];
            const nextPoint = route[step + 1] || point;
            const heading = this.calculateHeading(point, nextPoint);

            // console.log(`[Simulation] Driving... ${step}/${route.length}`);
            
            await supabase
                .from('emergency_requests')
                .update({
                    responder_location: `POINT(${point.longitude} ${point.latitude})`,
                    responder_heading: heading
                })
                .eq('id', requestId);

        }, 2000); // Update every 2 seconds
    },

    stopSimulation() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.activeSimulationId = null;
    },

    calculateHeading(from, to) {
        if (!from || !to) return 0;
        const toRad = (deg) => (deg * Math.PI) / 180;
        const toDeg = (rad) => (rad * 180) / Math.PI;
        
        const lat1 = toRad(from.latitude);
        const lat2 = toRad(to.latitude);
        const dLon = toRad(to.longitude - from.longitude);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    }
};