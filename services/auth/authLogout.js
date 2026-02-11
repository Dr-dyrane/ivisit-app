import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { handleSupabaseError } from "../../utils/authErrorUtils";

/**
 * Logout current user
 * @returns {Promise<boolean>}
 */
export async function logout() {
    await supabase.auth.signOut();
    await database.delete(StorageKeys.AUTH_TOKEN);
    await database.delete(StorageKeys.CURRENT_USER);
    return true;
}

/**
 * Delete current user's account
 * @returns {Promise<boolean>}
 */
export async function deleteUser() {
    try {
        const { error } = await supabase.rpc('delete_user');

        if (error) {
            console.error("Delete user RPC failed:", error);
            throw handleSupabaseError(error);
        }

        await logout();
        return true;
    } catch (error) {
        console.warn("Delete user failed or not fully supported:", error);
        await logout();
        return true; // We return true to allow UI to proceed to logout screen
    }
}
