-- Enable Realtime for emergency tables
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'ambulances'
    ) then
      alter publication supabase_realtime add table "public"."ambulances";
    end if;

    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'emergency_requests'
    ) then
      alter publication supabase_realtime add table "public"."emergency_requests";
    end if;

  end if;
end $$;
