import { database, StorageKeys } from "../../database";

// ============================================
// PENDING REGISTRATION / OTP STATE
// ============================================

export async function savePendingRegistration(data) {
    await database.write(StorageKeys.PENDING_REGISTRATION, data);
}

export async function getPendingRegistration() {
    return await database.read(StorageKeys.PENDING_REGISTRATION, null);
}

export async function clearPendingRegistration() {
    await database.delete(StorageKeys.PENDING_REGISTRATION);
}
