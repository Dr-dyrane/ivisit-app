@echo off
echo --- REDEPLOYING CANONICAL BASELINE ---
:: 1. Force Supabase to forget the previous version of the baseline
npx supabase migration repair --status reverted 20260218060000

:: 2. Re-apply the baseline with the new content (appended logic)
npx supabase db push
echo --- BASELINE REFRESHED ---
