
-- Migration: Add missing payment columns to emergency_requests
-- Required for payment flow integration in frontend

DO $$
BEGIN
    -- 1. Payment Method & Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'payment_method_id') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN payment_method_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'payment_status') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'payment_id') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN payment_id UUID;
    END IF;

    -- 2. Cost Breakdown Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'base_cost') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN base_cost DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'distance_surcharge') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN distance_surcharge DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'urgency_surcharge') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN urgency_surcharge DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'total_cost') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN total_cost DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'cost_breakdown') THEN
        ALTER TABLE public.emergency_requests ADD COLUMN cost_breakdown JSONB;
    END IF;

END $$;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
