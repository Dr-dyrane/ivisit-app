-- Add missing columns to visits table if they don't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'cost') then
        alter table "public"."visits" add column "cost" text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'insurance_covered') then
        alter table "public"."visits" add column "insurance_covered" boolean default true;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'preparation') then
        alter table "public"."visits" add column "preparation" text[];
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'prescriptions') then
        alter table "public"."visits" add column "prescriptions" text[];
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'summary') then
        alter table "public"."visits" add column "summary" text;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'next_visit') then
        alter table "public"."visits" add column "next_visit" text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'visits' and column_name = 'doctor_image') then
        alter table "public"."visits" add column "doctor_image" text;
    end if;
end $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
