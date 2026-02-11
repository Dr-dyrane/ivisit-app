import { 
    list, 
    create, 
    update, 
    ensureExists 
} from "./visitsCore";
import { 
    cancel, 
    complete, 
    setLifecycleState, 
    deleteVisit 
} from "./visitsActions";
import { fromDbRow } from "./visitsMapper";

export const visitsService = {
    list,
    create,
    update,
    ensureExists,
    cancel,
    complete,
    setLifecycleState,
    delete: deleteVisit, // Alias deleteVisit as delete to match original API
    fromDbRow
};

export default visitsService;
