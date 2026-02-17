-- Enable Realtime for notifications table
do $$
begin
  -- Check if supabase_realtime publication exists (it should in Supabase)
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Add notifications table to the publication if not already present
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table "public"."notifications";
    end if;
  end if;
end $$;
