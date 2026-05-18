# 📡 API Reference (Core RPCs)

Generated from `20260219010000_core_rpcs.sql` on 5/18/2026

| Function | Parameters | Returns |
|---|---|---|
| `nearby_hospitals` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15` | `TABLE ( id UUID, name TEXT, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, verified BOOLEAN, status TEXT, display_id TEXT, provider_type TEXT, emergency_eligible BOOLEAN, dispatch_eligible BOOLEAN, verification_status TEXT, provider_source TEXT, category_confidence NUMERIC )` |
| `nearby_providers` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, provider_type_filter TEXT DEFAULT NULL, radius_km INTEGER DEFAULT 15, result_limit INTEGER DEFAULT 20` | `TABLE ( id UUID, name TEXT, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, verified BOOLEAN, status TEXT, display_id TEXT, provider_type TEXT, emergency_eligible BOOLEAN, dispatch_eligible BOOLEAN, booking_eligible BOOLEAN, verification_status TEXT, provider_source TEXT, category_confidence NUMERIC, phone TEXT, rating DOUBLE PRECISION, image TEXT, place_id TEXT, provider_services JSONB, provider_specialties JSONB, insurance_accepted TEXT[], structured_hours JSONB, appointment_required BOOLEAN, report_turnaround TEXT, age_range TEXT, crisis_line TEXT )` |
| `nearby_ambulances` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 50` | `TABLE ( id UUID, call_sign TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, status TEXT, display_id TEXT )` |
| `get_all_auth_users` | `p_organization_id UUID DEFAULT NULL` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB, profile_role TEXT, profile_username TEXT, profile_first_name TEXT, profile_last_name TEXT, profile_full_name TEXT, profile_provider_type TEXT, profile_bvn_verified BOOLEAN, profile_organization_id UUID, profile_display_id TEXT )` |
| `update_hospital_by_admin` | `target_hospital_id UUID, payload JSONB` | `JSONB` |
| `delete_hospital_by_admin` | `target_hospital_id UUID` | `JSONB` |
| `get_user_statistics` | `` | `TABLE ( total_users BIGINT, total_profiles BIGINT, recent_signups BIGINT, email_verified_users BIGINT, phone_verified_users BIGINT, admin_count BIGINT, provider_count BIGINT, sponsor_count BIGINT, viewer_count BIGINT, patient_count BIGINT, org_admin_count BIGINT, dispatcher_count BIGINT )` |
| `admin_update_trending_topics` | `payload JSONB` | `JSONB` |
| `update_trending_topics_from_search` | `` | `JSONB` |
| `delete_user_by_admin` | `target_user_id UUID` | `JSONB` |
| `current_user_is_admin` | `` | `BOOLEAN` |
| `is_admin` | `` | `BOOLEAN` |
| `current_user_permission_level` | `` | `TEXT` |
| `search_auth_users` | `search_term TEXT` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB )` |
| `update_profile_by_admin` | `target_user_id UUID, profile_data JSONB` | `JSONB` |
| `notify_cash_approval_org_admins` | `p_request_id UUID, p_payment_id UUID, p_total_amount NUMERIC DEFAULT 0, p_fee_amount NUMERIC DEFAULT 0, p_hospital_name TEXT DEFAULT 'Hospital', p_service_type TEXT DEFAULT 'ambulance', p_display_id TEXT DEFAULT NULL, p_organization_id UUID DEFAULT NULL` | `JSONB` |
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
| `jsonb_to_point_geometry` | `p_location JSONB` | `geometry` |
| `canonicalize_emergency_status` | `p_status TEXT, p_default TEXT DEFAULT NULL` | `TEXT` |
| `set_emergency_transition_context` | `p_source TEXT, p_reason TEXT DEFAULT NULL, p_actor_id UUID DEFAULT auth.uid(), p_actor_role TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::JSONB, p_allow_status_write BOOLEAN DEFAULT true` | `VOID` |
| `console_create_emergency_request` | `p_payload JSONB` | `JSONB` |
| `console_update_emergency_request` | `p_request_id UUID, p_payload JSONB` | `JSONB` |
| `console_dispatch_emergency` | `p_request_id UUID, p_ambulance_id UUID, p_hospital_id UUID DEFAULT NULL, p_hospital_name TEXT DEFAULT NULL, p_bed_number TEXT DEFAULT NULL, p_responder_name TEXT DEFAULT NULL, p_responder_phone TEXT DEFAULT NULL, p_responder_vehicle_type TEXT DEFAULT NULL, p_responder_vehicle_plate TEXT DEFAULT NULL` | `JSONB` |
| `console_complete_emergency` | `p_request_id UUID` | `JSONB` |
| `console_cancel_emergency` | `p_request_id UUID, p_reason TEXT DEFAULT NULL` | `JSONB` |
| `console_update_responder_location` | `p_request_id UUID, p_location JSONB, p_heading DOUBLE PRECISION DEFAULT NULL` | `JSONB` |
| `patient_update_emergency_request` | `p_request_id UUID, p_payload JSONB DEFAULT '{}'::JSONB` | `JSONB` |
| `assign_ambulance_to_emergency` | `p_emergency_request_id UUID, p_ambulance_id UUID, p_priority INTEGER DEFAULT 1` | `JSONB` |
| `auto_assign_ambulance` | `p_emergency_request_id UUID, p_max_distance_km INTEGER DEFAULT 50, p_specialty_required TEXT DEFAULT NULL` | `JSONB` |
| `approve_cash_payment` | `p_payment_id UUID, p_request_id UUID` | `JSONB` |
| `decline_cash_payment` | `p_payment_id UUID, p_request_id UUID` | `JSONB` |
| `discharge_patient` | `request_uuid TEXT` | `BOOLEAN` |
| `cancel_bed_reservation` | `request_uuid TEXT` | `BOOLEAN` |
| `complete_trip` | `request_uuid TEXT` | `BOOLEAN` |
| `cancel_trip` | `request_uuid TEXT` | `BOOLEAN` |
| `ensure_emergency_chat_room` | `p_request_id UUID` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `send_emergency_chat_message` | `p_room_id UUID, p_body TEXT, p_kind TEXT DEFAULT 'text', p_client_message_id TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::JSONB` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `mark_emergency_chat_room_read` | `p_room_id UUID, p_message_id UUID DEFAULT NULL` | `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `archive_emergency_chat_room_on_request_close` | `` | `TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
