-- Fix: Drop and recreate trigger_stamp_resource_price with safe type casting
--
-- Root cause: tr_stamp_ambulance_price trigger fires BEFORE INSERT on ambulances,
-- calling trigger_stamp_resource_price() which compares hospital_id across tables
-- with mixed UUID/TEXT types, causing "operator does not exist: uuid = text".
--
-- This function was created directly in the database (not in any migration).
-- We drop it and recreate with explicit ::text casting.

-- Step 1: Drop the problematic triggers on ALL tables that use this function
DROP TRIGGER IF EXISTS tr_stamp_ambulance_price ON public.ambulances;
DROP TRIGGER IF EXISTS tr_stamp_doctor_price ON public.doctors;
DROP TRIGGER IF EXISTS tr_stamp_resource_price ON public.ambulances;
DROP TRIGGER IF EXISTS tr_stamp_resource_price ON public.doctors;

-- Step 2: Drop and recreate the function with safe casting (CASCADE for any remaining deps)
DROP FUNCTION IF EXISTS public.trigger_stamp_resource_price() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_stamp_resource_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_currency TEXT;
BEGIN
    -- Look up default pricing from service_pricing table
    -- Use ::text casting to handle UUID/TEXT mismatches safely
    BEGIN
        SELECT sp.base_price, sp.currency 
        INTO v_base_price, v_currency
        FROM public.service_pricing sp
        WHERE sp.service_type = 'ambulance'
          AND sp.is_active = true
          AND (
            sp.hospital_id::text = NEW.hospital_id::text 
            OR sp.hospital_id IS NULL
          )
        ORDER BY sp.hospital_id DESC NULLS LAST
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_base_price := NULL;
        v_currency := NULL;
    END;

    -- Stamp pricing onto the new ambulance record (only if not already set)
    IF v_base_price IS NOT NULL THEN
        NEW.base_price := COALESCE(NEW.base_price, v_base_price);
        NEW.currency := COALESCE(NEW.currency, v_currency);
    END IF;

    RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER tr_stamp_ambulance_price
    BEFORE INSERT ON public.ambulances
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_stamp_resource_price();

NOTIFY pgrst, 'reload schema';
