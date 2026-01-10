-- Migration to add emergency_notes column to medical_profiles table

alter table "public"."medical_profiles" 
add column if not exists "emergency_notes" text;
