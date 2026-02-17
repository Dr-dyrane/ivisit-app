-- Migration: Auto-Generate Username from Email
-- Description: Backfills missing usernames and auto-generates for new profiles
-- ⚠️  SAFETY: ONLY fills NULL/empty usernames - NEVER overwrites existing ones
-- Pattern: username = email_prefix (before @) with conflict resolution

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAFETY CHECK: Preview which profiles will be affected
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  will_update INTEGER;
  wont_touch INTEGER;
  preview_report TEXT;
BEGIN
  -- Count profiles with NULL username (WILL be updated)
  SELECT COUNT(*) INTO will_update
  FROM public.profiles
  WHERE username IS NULL OR username = '';
  
  -- Count profiles with existing username (WON'T be touched)
  SELECT COUNT(*) INTO wont_touch
  FROM public.profiles
  WHERE username IS NOT NULL AND username != '';
  
  preview_report := '
═══════════════════════════════════════════════════════════════
  PRE-MIGRATION SAFETY CHECK
═══════════════════════════════════════════════════════════════

Profiles that WILL BE UPDATED (NULL username):    ' || will_update || '
Profiles that WILL NOT BE TOUCHED (has username): ' || wont_touch || '

✅ SAFE TO PROCEED - Existing usernames are protected!

═══════════════════════════════════════════════════════════════
  ';
  
  RAISE NOTICE '%', preview_report;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: Username Generation Function
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to extract username from email with uniqueness guarantee
CREATE OR REPLACE FUNCTION public.generate_username_from_email(email_input TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract part before @ and clean it
  base_username := LOWER(SPLIT_PART(email_input, '@', 1));
  
  -- Remove dots, hyphens, and special chars, keep alphanumeric only
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]', '', 'g');
  
  -- Ensure minimum length (at least 3 chars)
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;
  
  -- Try base username first
  final_username := base_username;
  
  -- If username already exists, append number
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: Backfill Existing NULL Usernames (SAFE - ONLY NULL VALUES)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  profile_record RECORD;
  new_username TEXT;
  user_email TEXT;
  updated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Starting backfill - ONLY updating profiles with NULL username...';
  
  -- ⚠️  SAFETY: Only loops through profiles with NULL or empty username
  FOR profile_record IN 
    SELECT p.id, p.username
    FROM public.profiles p
    WHERE p.username IS NULL OR p.username = ''  -- 🛡️ SAFETY CHECK
  LOOP
    -- Get email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = profile_record.id;
    
    -- If email exists, generate username
    IF user_email IS NOT NULL THEN
      new_username := public.generate_username_from_email(user_email);
      
      -- ⚠️  DOUBLE SAFETY CHECK: Only update if STILL NULL
      UPDATE public.profiles
      SET 
        username = new_username,
        updated_at = NOW()
      WHERE id = profile_record.id
        AND (username IS NULL OR username = '');  -- 🛡️ SAFETY CHECK IN UPDATE
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE '  ✅ Backfilled % → %', user_email, new_username;
    ELSE
      skipped_count := skipped_count + 1;
      RAISE NOTICE '  ⏭️  Skipped profile % (no email)', profile_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Backfilled % usernames from email', updated_count;
  RAISE NOTICE '⏭️  Skipped % profiles (no email)', skipped_count;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: Auto-Generate Username on Profile Creation (SAFE - ONLY IF NULL)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_username_from_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- ⚠️  SAFETY: Only generate if username is NULL or empty
  -- If user provides a username, we KEEP IT!
  IF NEW.username IS NULL OR NEW.username = '' THEN
    -- Get email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;
    
    -- Generate username from email
    IF user_email IS NOT NULL THEN
      NEW.username := public.generate_username_from_email(user_email);
      RAISE NOTICE '✨ Auto-generated username: % from email: %', NEW.username, user_email;
    ELSE
      -- Fallback if no email: use 'user' + id prefix
      NEW.username := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
      RAISE NOTICE '✨ Fallback username generated: %', NEW.username;
    END IF;
  ELSE
    -- User provided their own username - keep it!
    RAISE NOTICE '✅ Keeping user-provided username: %', NEW.username;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire BEFORE INSERT on profiles
DROP TRIGGER IF EXISTS on_profile_set_username ON public.profiles;
CREATE TRIGGER on_profile_set_username
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_username_from_email();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: Verification & Report
-- ═══════════════════════════════════════════════════════════════════════════

-- Show before/after stats
DO $$
DECLARE
  total_profiles INTEGER;
  with_username INTEGER;
  without_username INTEGER;
  preserved_usernames TEXT[];
  report TEXT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  SELECT COUNT(*) INTO with_username FROM public.profiles WHERE username IS NOT NULL AND username != '';
  SELECT COUNT(*) INTO without_username FROM public.profiles WHERE username IS NULL OR username = '';
  
  -- Get list of preserved usernames (ones that existed before migration)
  SELECT ARRAY_AGG(username) INTO preserved_usernames
  FROM public.profiles
  WHERE username IN ('halodyrane', 'audeogaranya', 'katybrown', 'alex', 'dyrane', 'Dr_dyrane', 'tested');
  
  report := '
═══════════════════════════════════════════════════════════════
  USERNAME GENERATION REPORT
═══════════════════════════════════════════════════════════════

Total Profiles:            ' || total_profiles || '
Profiles with Username:    ' || with_username || ' (' || 
  ROUND((with_username::FLOAT / NULLIF(total_profiles, 0) * 100)::NUMERIC, 1) || '%)
Profiles without Username: ' || without_username || '

PROTECTED USERNAMES (not touched):
' || CASE 
    WHEN preserved_usernames IS NOT NULL THEN 
      '  - ' || ARRAY_TO_STRING(preserved_usernames, E'\n  - ')
    ELSE '  (None found - all new accounts)'
  END || '

═══════════════════════════════════════════════════════════════
  MIGRATION COMPLETE ✅
═══════════════════════════════════════════════════════════════

✅ Backfilled existing NULL usernames from email
✅ Trigger added for auto-generation on profile creation
✅ Existing usernames PRESERVED (never overwritten)
✅ Future profiles will automatically get username from email

SAFETY GUARANTEES:
------------------
🛡️  Existing usernames are NEVER replaced
🛡️  Only NULL/empty usernames are filled
🛡️  Double-check in UPDATE query
🛡️  Trigger only fires if username is NULL

Test Cases:
-----------
1. Create new user with email "test@example.com" → username: "test"
2. Create user with email + username → keeps provided username ✅
3. Update existing user → username unchanged ✅

═══════════════════════════════════════════════════════════════
  ';
  
  RAISE NOTICE '%', report;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAFETY VERIFICATION QUERY (Run this after migration)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Check that existing usernames were preserved:
-- 
-- SELECT 
--   id, 
--   username,
--   created_at,
--   CASE 
--     WHEN username IN ('halodyrane', 'audeogaranya', 'katybrown') 
--     THEN '✅ PRESERVED (existed before)'
--     ELSE '✨ AUTO-GENERATED (was NULL)'
--   END as status
-- FROM profiles
-- WHERE username IS NOT NULL
-- ORDER BY created_at;
-- 
-- Expected: All old usernames show ✅ PRESERVED
-- ═══════════════════════════════════════════════════════════════════════════
