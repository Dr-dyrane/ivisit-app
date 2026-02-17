-- Add meeting_link column to visits table
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'meeting_link') then
        alter table "public"."visits" add column "meeting_link" text;
    end if;
end $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
