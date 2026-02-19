# 📡 API Reference (Core RPCs)

Generated from `20260219010000_core_rpcs.sql` on 2/19/2026

| Function | Parameters | Returns |
|---|---|---|
| `nearby_hospitals` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15` | `TABLE ( id UUID, name TEXT, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, verified BOOLEAN, status TEXT, display_id TEXT )` |
| `nearby_ambulances` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 50` | `TABLE ( id UUID, call_sign TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, status TEXT, display_id TEXT )` |
| `get_all_auth_users` | `p_organization_id UUID DEFAULT NULL` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB, profile_role TEXT, profile_username TEXT, profile_first_name TEXT, profile_last_name TEXT, profile_full_name TEXT, profile_provider_type TEXT, profile_bvn_verified BOOLEAN, profile_organization_id UUID, profile_display_id TEXT )` |
| `update_hospital_by_admin` | `target_hospital_id UUID, payload JSONB` | `JSONB` |
| `get_user_statistics` | `` | `TABLE ( total_users BIGINT, total_profiles BIGINT, recent_signups BIGINT, email_verified_users BIGINT, phone_verified_users BIGINT, admin_count BIGINT, provider_count BIGINT, sponsor_count BIGINT, viewer_count BIGINT, patient_count BIGINT, org_admin_count BIGINT, dispatcher_count BIGINT )` |
| `admin_update_trending_topics` | `payload JSONB` | `JSONB` |
| `update_trending_topics_from_search` | `` | `JSONB` |
| `delete_user_by_admin` | `target_user_id UUID` | `JSONB` |
| `current_user_is_admin` | `` | `BOOLEAN` |
| `is_admin` | `` | `BOOLEAN` |
| `current_user_permission_level` | `` | `TEXT` |
| `search_auth_users` | `search_term TEXT` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB )` |
| `update_profile_by_admin` | `target_user_id UUID, payload JSONB` | `JSONB` |
| `delete_user` | `` | `JSONB` |
| `get_trending_searches` | `days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10` | `TABLE ( id UUID, query TEXT, category TEXT, rank INTEGER )` |
| `get_search_analytics` | `days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10` | `TABLE ( query TEXT, search_count BIGINT, unique_users BIGINT, last_searched TIMESTAMPTZ, rank INTEGER )` |
| `get_search_analytics_summary` | `days_back INTEGER DEFAULT 7` | `TABLE ( total_searches BIGINT, unique_searchers BIGINT, unique_queries BIGINT, avg_searches_per_user NUMERIC, top_query TEXT )` |
| `log_user_activity` | `p_action TEXT, p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL, p_description TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'` | `JSONB` |
| `get_recent_activity` | `limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0` | `TABLE ( id UUID, user_id UUID, action TEXT, entity_type TEXT, entity_id UUID, description TEXT, metadata JSONB, created_at TIMESTAMPTZ )` |
| `get_activity_stats` | `days_back INTEGER DEFAULT 7` | `JSONB` |
| `get_org_stripe_status` | `p_organization_id UUID` | `JSONB` |
| `process_cash_payment` | `p_emergency_request_id UUID, p_organization_id UUID, p_amount NUMERIC` | `JSONB` |
| `check_cash_eligibility` | `p_organization_id UUID` | `JSONB` |
| `process_wallet_payment` | `p_user_id UUID, p_amount NUMERIC, p_emergency_request_id UUID DEFAULT NULL` | `JSONB` |
| `calculate_emergency_cost_v2` | `p_service_type TEXT, p_hospital_id UUID DEFAULT NULL, p_ambulance_type TEXT DEFAULT NULL, p_distance_km NUMERIC DEFAULT 0` | `JSONB` |
| `reload_schema` | `` | `VOID` |
| `get_available_doctors` | `p_hospital_id UUID, p_specialty TEXT DEFAULT NULL` | `TABLE ( doctor_id UUID, doctor_name TEXT, specialty TEXT, current_patients INTEGER, max_patients INTEGER, availability_status TEXT )` |
| `assign_doctor_to_emergency` | `p_emergency_request_id UUID, p_doctor_id UUID, p_notes TEXT DEFAULT NULL` | `JSONB` |
| `get_service_price` | `p_service_type TEXT, p_hospital_id UUID DEFAULT NULL` | `TABLE (service_name TEXT, price NUMERIC, currency TEXT)` |
| `get_room_price` | `p_room_type TEXT, p_hospital_id UUID DEFAULT NULL` | `TABLE (room_name TEXT, price NUMERIC, currency TEXT)` |
| `rate_visit` | `p_visit_id UUID, p_rating SMALLINT, p_comment TEXT DEFAULT NULL` | `JSONB` |
