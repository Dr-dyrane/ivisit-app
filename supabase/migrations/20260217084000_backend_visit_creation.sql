-- Migration: Backend-Automated Visit Creation
-- Ensures visits are created by DB trigger on emergency_requests INSERT,
-- not by frontend code. This eliminates the RLS/UUID errors from client-side visit creation.

-- Drop old trigger to replace it
DROP TRIGGER IF EXISTS on_emergency_status_change ON public.emergency_requests;
DROP TRIGGER IF EXISTS on_emergency_insert_create_visit ON public.emergency_requests;

-- Recreate the sync function to handle BOTH insert and update
CREATE OR REPLACE FUNCTION public.sync_emergency_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- On INSERT: Create a visit record for any new emergency request
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.visits (
            id,
            user_id,
            hospital_id,
            hospital,
            specialty,
            date,
            time,
            type,
            status,
            request_id,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.user_id,
            NEW.hospital_id,
            NEW.hospital_name,
            NEW.specialty,
            to_char(NEW.created_at, 'YYYY-MM-DD'),
            to_char(NEW.created_at, 'HH12:MI AM'),
            CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
            CASE 
                WHEN NEW.status = 'in_progress' THEN 'upcoming'
                ELSE NEW.status 
            END,
            NEW.request_id,
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING; -- Safety: don't error if somehow exists
        
        RETURN NEW;
    END IF;

    -- On UPDATE: Sync status changes to visits
    IF TG_OP = 'UPDATE' THEN
        -- Update the visit status when emergency status changes
        UPDATE public.visits 
        SET status = CASE 
                WHEN NEW.status = 'completed' THEN 'completed'
                WHEN NEW.status = 'cancelled' THEN 'cancelled'
                WHEN NEW.status = 'arrived' THEN 'in-progress'
                WHEN NEW.status = 'accepted' THEN 'upcoming'
                ELSE visits.status -- Keep current if no mapping
            END,
            updated_at = NOW()
        WHERE id = NEW.id;

        -- If no visit exists yet (edge case), create one
        IF NOT FOUND THEN
            INSERT INTO public.visits (
                id, user_id, hospital_id, hospital, specialty,
                date, time, type, status, request_id, created_at, updated_at
            )
            VALUES (
                NEW.id, NEW.user_id, NEW.hospital_id, NEW.hospital_name, NEW.specialty,
                to_char(NEW.created_at, 'YYYY-MM-DD'),
                to_char(NEW.created_at, 'HH12:MI AM'),
                CASE WHEN NEW.service_type = 'ambulance' THEN 'Ambulance Ride' ELSE 'Bed Booking' END,
                NEW.status,
                NEW.request_id,
                NEW.created_at,
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Fire on BOTH INSERT and UPDATE
CREATE TRIGGER on_emergency_status_change
    AFTER INSERT OR UPDATE ON public.emergency_requests
    FOR EACH ROW EXECUTE PROCEDURE public.sync_emergency_to_history();

NOTIFY pgrst, 'reload schema';
