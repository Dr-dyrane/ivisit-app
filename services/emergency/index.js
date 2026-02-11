import { 
    list, 
    create, 
    update, 
    getActive, 
    EmergencyRequestStatus 
} from "./emergencyCore";
import { 
    updateLocation, 
    setStatus 
} from "./emergencyActions";
import { 
    subscribeToEmergencyUpdates, 
    subscribeToAmbulanceLocation, 
    subscribeToHospitalBeds, 
    calculateRequestCost, 
    checkRequestInsuranceCoverage 
} from "./emergencyRealtime";

export { EmergencyRequestStatus };

// Re-export hospital logic
export { processHospitalsWithLocation } from './hospitalLogic';

export const emergencyRequestsService = {
    list,
    create,
    update,
    getActive,
    updateLocation,
    setStatus,
    subscribeToEmergencyUpdates,
    subscribeToAmbulanceLocation,
    subscribeToHospitalBeds,
    calculateRequestCost,
    checkRequestInsuranceCoverage
};

export default emergencyRequestsService;
