-- Add view_preferences to preferences table
ALTER TABLE "public"."preferences" ADD COLUMN IF NOT EXISTS "view_preferences" jsonb DEFAULT '{}'::jsonb;
