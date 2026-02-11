import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { insuranceService } from "../insuranceService";
import { handleSupabaseError } from "../../utils/authErrorUtils";
import { formatUser } from "../mappers/userMapper";
import { getUserProfile } from "./authProfile";

/**
 * Request OTP for Email or Phone
 * @param {Object} { email, phone }
 */
export async function requestOtp({ email, phone }) {
    if (phone) {
        const { error } = await supabase.auth.signInWithOtp({
            phone,
        });

        if (error) return { success: false, error: handleSupabaseError(error).message };

        return { success: true, data: { message: "OTP sent to phone" } };
    }

    if (email) {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true, // Create user if not exists (for signup flow)
            }
        });

        if (error) return { success: false, error: handleSupabaseError(error).message };

        return { success: true, data: { message: "Code sent to email" } };
    }

    return { success: false, error: "Email or Phone required" };
}

/**
 * Verify OTP
 * @param {Object} { email, phone, otp }
 */
export async function verifyOtp({ email, phone, otp }) {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        phone,
        token: otp,
        type: phone ? 'sms' : 'email',
    });

    if (error) return { success: false, error: handleSupabaseError(error).message };

    let profile = await getUserProfile(data.user.id);
    if (!profile.createdAt) {
        console.log("[authService] Profile not yet available, continuing with defaults");
    }

    const isExistingUser = !!profile.username;

    let hasInsurance = false;
    try {
        const policies = await insuranceService.list();
        hasInsurance = policies && policies.length > 0;
    } catch (e) {
        console.warn("Failed to fetch insurance status during OTP verify:", e);
    }

    if (!hasInsurance) {
        try {
            await insuranceService.enrollBasicScheme();
            hasInsurance = true;
        } catch (insError) {
            console.warn("[authService] Failed to auto-enroll in insurance (OTP):", insError);
        }
    }

    const user = formatUser(data.user, data.session?.access_token, profile, hasInsurance);

    await database.write(StorageKeys.CURRENT_USER, user);
    await database.write(StorageKeys.AUTH_TOKEN, data.session?.access_token);

    return { success: true, data: { ...user, isExistingUser } };
}
