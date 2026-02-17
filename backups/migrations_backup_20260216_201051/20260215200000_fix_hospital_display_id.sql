
-- Fix: Add display_id column to hospitals and sync with id_mappings
-- This satisfies the frontend expectation while keeping the id_mappings system as the source of truth.

DO $$
BEGIN
    -- 1. Add display_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'display_id') THEN
        ALTER TABLE public.hospitals ADD COLUMN display_id TEXT;
        
        -- Add unique constraint
        ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_display_id_key UNIQUE (display_id);
    END IF;

    -- 2. Backfill display_id from id_mappings
    UPDATE public.hospitals h
    SET display_id = im.display_id
    FROM public.id_mappings im
    WHERE h.id = im.entity_id 
    AND im.entity_type = 'hospital'
    AND h.display_id IS NULL;

    -- 3. If any hospitals still lack a display_id, generate one utilizing the existing function
    -- (This covers the case where a hospital exists but has no mapping yet)
    WITH missing_ids AS (
        SELECT id FROM public.hospitals WHERE display_id IS NULL
    )
    INSERT INTO public.id_mappings (entity_type, entity_id, display_id)
    SELECT 'hospital', id, public.generate_display_id('ORG')
    FROM missing_ids
    ON CONFLICT (entity_type, entity_id) DO NOTHING;

    -- Update again to catch the newly created mappings
    UPDATE public.hospitals h
    SET display_id = im.display_id
    FROM public.id_mappings im
    WHERE h.id = im.entity_id 
    AND im.entity_type = 'hospital'
    AND h.display_id IS NULL;

END $$;

-- 4. Create Trigger to automatic syncing (id_mappings -> hospitals)
CREATE OR REPLACE FUNCTION public.sync_hospital_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.entity_type = 'hospital' THEN
        UPDATE public.hospitals
        SET display_id = NEW.display_id
        WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_hospital_display_id_trigger ON public.id_mappings;
CREATE TRIGGER sync_hospital_display_id_trigger
AFTER INSERT OR UPDATE ON public.id_mappings
FOR EACH ROW EXECUTE FUNCTION public.sync_hospital_display_id();

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
