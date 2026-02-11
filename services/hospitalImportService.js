import { importHospitalsFromGoogle } from './hospital-import/hospitalImportCore';
import { insertHospitalFromGoogle, updateHospitalFromGoogle } from './hospital-import/hospitalImportDb';
import {
    getPendingHospitals,
    approveHospital,
    rejectHospital,
    assignHospitalToAdmin,
    getHospitalsByAdmin,
    getImportLogs
} from './hospital-import/hospitalImportAdmin';

class HospitalImportService {
    importHospitalsFromGoogle = importHospitalsFromGoogle;
    insertHospitalFromGoogle = insertHospitalFromGoogle;
    updateHospitalFromGoogle = updateHospitalFromGoogle;
    getPendingHospitals = getPendingHospitals;
    approveHospital = approveHospital;
    rejectHospital = rejectHospital;
    assignHospitalToAdmin = assignHospitalToAdmin;
    getHospitalsByAdmin = getHospitalsByAdmin;
    getImportLogs = getImportLogs;
}

export default new HospitalImportService();
