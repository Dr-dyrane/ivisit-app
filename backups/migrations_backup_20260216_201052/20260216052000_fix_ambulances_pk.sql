-- Fix Ambulances PK and Replica Identity

DO $$
BEGIN
    -- Check if PK exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'ambulances' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.ambulances ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Ensure Replica Identity is Default (requires PK)
ALTER TABLE public.ambulances REPLICA IDENTITY DEFAULT;
