-- Enhance support_tickets table with missing columns
DO $$ 
BEGIN 
    -- Add priority column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'priority'
    ) THEN 
        ALTER TABLE public.support_tickets ADD COLUMN priority text DEFAULT 'normal';
    END IF;

    -- Add category column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'category'
    ) THEN 
        ALTER TABLE public.support_tickets ADD COLUMN category text DEFAULT 'general';
    END IF;

    -- Add assigned_to column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'assigned_to'
    ) THEN 
        ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid references auth.users(id);
    END IF;

END $$;

-- Add admin policies for support tickets
create policy "Admins can read all tickets"
on public.support_tickets for select
to authenticated
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
  or auth.uid() = user_id
);

create policy "Admins can update all tickets"
on public.support_tickets for update
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

-- Enable realtime for support tickets
alter publication supabase_realtime add table public.support_tickets;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
