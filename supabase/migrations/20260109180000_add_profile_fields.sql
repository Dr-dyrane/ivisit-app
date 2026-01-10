-- Add missing columns to profiles table
alter table "public"."profiles" 
add column "address" text,
add column "gender" text,
add column "date_of_birth" text;
