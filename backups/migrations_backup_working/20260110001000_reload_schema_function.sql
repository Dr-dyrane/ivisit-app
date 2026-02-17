create or replace function reload_schema()
returns void
language plpgsql
security definer
as $$
begin
  notify pgrst, 'reload schema';
end;
$$;
