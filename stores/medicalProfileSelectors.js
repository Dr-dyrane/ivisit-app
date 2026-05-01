export const selectMedicalProfile = (state) => state?.profile ?? null;

export const selectMedicalProfileReady = (state) => state?.isReady === true;

export default selectMedicalProfile;
