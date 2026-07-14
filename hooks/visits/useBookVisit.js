import { useBookVisitScreenModel } from "./useBookVisitScreenModel";

// Compatibility facade for any deferred import of the original Book Visit hook.
// All booking behavior now flows through the canonical scheduled-visit model.
export function useBookVisit() {
  return useBookVisitScreenModel();
}

export default useBookVisit;
