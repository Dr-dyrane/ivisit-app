-- Fix foreign key relationship between visits and hospitals
-- The relationship was missing in the schema cache

-- First, fix the type mismatch: hospital_id should be UUID to match hospitals.id
DO $$
BEGIN
    -- Check if hospital_id is text and convert to UUID if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visits' 
        AND column_name = 'hospital_id' 
        AND data_type = 'text'
    ) THEN
        -- Create a temporary UUID column
        ALTER TABLE visits ADD COLUMN hospital_id_new UUID;
        
        -- Convert existing text values to UUID (only valid ones)
        UPDATE visits 
        SET hospital_id_new = hospital_id::UUID 
        WHERE hospital_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Drop old text column
        ALTER TABLE visits DROP COLUMN hospital_id;
        
        -- Rename new column to hospital_id
        ALTER TABLE visits RENAME COLUMN hospital_id_new TO hospital_id;
    END IF;
    
    -- Now add the foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'visits_hospital_id_fkey' 
        AND table_name = 'visits'
    ) THEN
        ALTER TABLE visits 
        ADD CONSTRAINT visits_hospital_id_fkey 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id);
    END IF;
END $$;

-- Refresh schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- Add comment for documentation
COMMENT ON COLUMN visits.hospital_id IS 'Foreign key to hospitals table - enables proper relationship queries';
