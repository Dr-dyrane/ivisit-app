-- Phase 8: Golden Path Seeding (Part 1: Schema)
-- Ensure required columns exist for Hemet Ecosystem seeding

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fix Schema Drift for Hospitals
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS emergency_services text[];
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
