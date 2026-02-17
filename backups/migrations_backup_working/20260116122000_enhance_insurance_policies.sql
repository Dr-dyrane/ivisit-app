-- Enhance insurance_policies table with missing columns
DO $$ 
BEGIN 
    -- Add user_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'user_id'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN user_id uuid references auth.users(id) on delete cascade;
    END IF;

    -- Add provider_name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'provider_name'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN provider_name text;
    END IF;

    -- Add coverage_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'coverage_type'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN coverage_type text;
    END IF;

    -- Add start_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'start_date'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN start_date timestamp with time zone;
    END IF;

    -- Add end_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'end_date'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN end_date timestamp with time zone;
    END IF;

    -- Add front_image_url column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'front_image_url'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN front_image_url text;
    END IF;

    -- Add back_image_url column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'back_image_url'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN back_image_url text;
    END IF;

    -- Add verified column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'verified'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN verified boolean default false;
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'created_at'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN created_at timestamp with time zone default now();
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'insurance_policies' AND column_name = 'updated_at'
    ) THEN 
        ALTER TABLE public.insurance_policies ADD COLUMN updated_at timestamp with time zone default now();
    END IF;

END $$;

-- Add admin policies for insurance policies
create policy "Admins can read all policies"
on public.insurance_policies for select
to authenticated
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
);

create policy "Admins can update all policies"
on public.insurance_policies for update
to authenticated
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
)
with check (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
);

create policy "Admins can insert policies"
on public.insurance_policies for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
);

create policy "Admins can delete policies"
on public.insurance_policies for delete
to authenticated
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
);

-- Enable realtime for insurance policies
alter publication supabase_realtime add table public.insurance_policies;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
