-- Reload the PostgREST schema cache to recognize new tables/columns
NOTIFY pgrst, 'reload schema';
