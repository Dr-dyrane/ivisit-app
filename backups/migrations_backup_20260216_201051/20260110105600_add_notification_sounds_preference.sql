-- Add notification_sounds_enabled column to preferences table
alter table public.preferences
add column if not exists notification_sounds_enabled boolean not null default true;

-- Update existing rows to have notification_sounds_enabled = true
update public.preferences
set notification_sounds_enabled = true
where notification_sounds_enabled is null;
