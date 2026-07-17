# 📡 API Reference (Core RPCs)

Generated from `20260219010000_core_rpcs.sql` on 7/17/2026

| Function | Parameters | Returns |
|---|---|---|
| `nearby_hospitals` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 15` | `TABLE ( id UUID, name TEXT, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, verified BOOLEAN, status TEXT, display_id TEXT, provider_type TEXT, emergency_eligible BOOLEAN, dispatch_eligible BOOLEAN, verification_status TEXT, provider_source TEXT, category_confidence NUMERIC )` |
| `nearby_providers` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, provider_type_filter TEXT DEFAULT NULL, radius_km INTEGER DEFAULT 15, result_limit INTEGER DEFAULT 20` | `TABLE ( id UUID, name TEXT, address TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, verified BOOLEAN, status TEXT, display_id TEXT, provider_type TEXT, emergency_eligible BOOLEAN, dispatch_eligible BOOLEAN, booking_eligible BOOLEAN, verification_status TEXT, provider_source TEXT, category_confidence NUMERIC, phone TEXT, rating DOUBLE PRECISION, image TEXT, place_id TEXT )` |
| `nearby_ambulances` | `user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_km INTEGER DEFAULT 50` | `TABLE ( id UUID, call_sign TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distance DOUBLE PRECISION, status TEXT, display_id TEXT )` |
| `get_all_auth_users` | `p_organization_id UUID DEFAULT NULL` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB, profile_role TEXT, profile_username TEXT, profile_first_name TEXT, profile_last_name TEXT, profile_full_name TEXT, profile_provider_type TEXT, profile_bvn_verified BOOLEAN, profile_organization_id UUID, profile_display_id TEXT )` |
| `update_hospital_by_admin` | `target_hospital_id UUID, payload JSONB` | `JSONB` |
| `delete_hospital_by_admin` | `target_hospital_id UUID` | `JSONB` |
| `get_user_statistics` | `` | `TABLE ( total_users BIGINT, total_profiles BIGINT, recent_signups BIGINT, email_verified_users BIGINT, phone_verified_users BIGINT, admin_count BIGINT, provider_count BIGINT, sponsor_count BIGINT, viewer_count BIGINT, patient_count BIGINT, org_admin_count BIGINT, dispatcher_count BIGINT ) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` |
| `admin_update_trending_topics` | `payload JSONB` | `JSONB` |
| `update_trending_topics_from_search` | `` | `JSONB` |
| `delete_user_by_admin` | `target_user_id UUID` | `JSONB` |
| `current_user_is_admin` | `` | `BOOLEAN` |
| `is_admin` | `` | `BOOLEAN` |
| `current_user_permission_level` | `` | `TEXT` |
| `search_auth_users` | `search_term TEXT` | `TABLE ( id UUID, email TEXT, phone TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, raw_user_meta_data JSONB )` |
| `update_profile_by_admin` | `target_user_id UUID, profile_data JSONB` | `JSONB` |
| `notify_cash_approval_org_admins_internal` | `p_request_id UUID, p_payment_id UUID, p_total_amount NUMERIC DEFAULT 0, p_fee_amount NUMERIC DEFAULT 0, p_hospital_name TEXT DEFAULT 'Hospital', p_service_type TEXT DEFAULT 'ambulance', p_display_id TEXT DEFAULT NULL, p_organization_id UUID DEFAULT NULL` | `JSONB` |
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
| `skip_visit_rating` | `p_visit_id UUID` | `JSONB` |
| `jsonb_to_point_geometry` | `p_location JSONB` | `geometry` |
| `canonicalize_emergency_status` | `p_status TEXT, p_default TEXT DEFAULT NULL` | `TEXT` |
| `set_emergency_transition_context` | `p_source TEXT, p_reason TEXT DEFAULT NULL, p_actor_id UUID DEFAULT auth.uid(), p_actor_role TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::JSONB, p_allow_status_write BOOLEAN DEFAULT true` | `VOID` |
| `ambulance_dispatch_readiness_snapshot` | `p_ambulance_id UUID, p_request_id UUID DEFAULT NULL` | `JSONB` |
| `get_ambulance_dispatch_readiness` | `p_ambulance_id UUID, p_request_id UUID DEFAULT NULL` | `JSONB` |
| `get_eligible_ambulance_responders` | `p_organization_id UUID DEFAULT NULL` | `TABLE ( responder_id UUID, display_id TEXT, full_name TEXT, phone TEXT, provider_type TEXT, linked_ambulance_id UUID, active_request_id UUID, is_available BOOLEAN )` |
| `staff_ambulance_responder` | `p_ambulance_id UUID, p_responder_id UUID` | `JSONB` |
| `offer_responder_assignment` | `p_request_id UUID, p_ambulance_id UUID, p_offered_by UUID DEFAULT auth.uid(), p_source TEXT DEFAULT 'dispatch'` | `JSONB` |
| `release_current_responder_assignment` | `p_request_id UUID, p_disposition TEXT, p_reason TEXT, p_actor_id UUID DEFAULT auth.uid(), p_actor_role TEXT DEFAULT NULL` | `JSONB` |
| `responder_accept_emergency` | `p_request_id UUID` | `JSONB` |
| `responder_arrive_emergency` | `p_request_id UUID` | `JSONB` |
| `responder_complete_emergency` | `p_request_id UUID` | `JSONB` |
| `responder_decline_emergency` | `p_request_id UUID, p_reason TEXT` | `JSONB` |
| `dispatcher_release_responder_assignment` | `p_request_id UUID, p_reason TEXT` | `JSONB` |
| `patient_acknowledge_responder_arrival` | `p_request_id UUID` | `JSONB` |
| `report_responder_telemetry` | `p_payload JSONB` | `JSONB` |
| `get_responder_telemetry_state` | `p_request_id UUID` | `JSONB` |
| `get_current_emergency_responder` | `p_request_id UUID` | `JSONB` |
| `get_driver_dispatch_feed` | `` | `JSONB` |
| `expire_responder_offers` | `p_limit INTEGER DEFAULT 100` | `JSONB` |
| `console_create_emergency_request` | `p_payload JSONB` | `JSONB` |
| `console_update_emergency_request` | `p_request_id UUID, p_payload JSONB` | `JSONB` |
| `console_accept_bed_emergency` | `p_request_id UUID, p_hospital_id UUID DEFAULT NULL, p_bed_number TEXT DEFAULT NULL` | `JSONB` |
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
| `complete_trip` | `request_uuid TEXT` | `BOOLEAN` |
| `cancel_trip` | `request_uuid TEXT` | `BOOLEAN` |
| `ensure_emergency_chat_room` | `p_request_id UUID` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `send_emergency_chat_message` | `p_room_id UUID, p_body TEXT, p_kind TEXT DEFAULT 'text', p_client_message_id TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::JSONB` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `mark_emergency_chat_room_read` | `p_room_id UUID, p_message_id UUID DEFAULT NULL` | `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `archive_emergency_chat_room_on_request_close` | `` | `TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `p_scheduled_visit_duration` | `p_care_mode TEXT` | `INTERVAL LANGUAGE sql IMMUTABLE SET search_path = public` |
| `p_select_bookable_doctor` | `p_hospital_id UUID, p_specialty TEXT, p_care_mode TEXT, p_scheduled_start_at TIMESTAMPTZ, p_scheduled_end_at TIMESTAMPTZ, p_exclude_visit_id UUID DEFAULT NULL` | `UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `get_book_visit_availability` | `p_hospital_id UUID, p_specialty TEXT, p_care_mode TEXT, p_from_at TIMESTAMPTZ DEFAULT NOW(), p_to_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days'` | `TABLE ( hospital_id UUID, doctor_id UUID, doctor_name TEXT, doctor_image TEXT, specialty TEXT, care_mode TEXT, scheduled_start_at TIMESTAMPTZ, scheduled_end_at TIMESTAMPTZ, scheduled_timezone TEXT ) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` |
| `get_console_doctor_schedules` | `p_hospital_id UUID DEFAULT NULL, p_from_date DATE DEFAULT CURRENT_DATE, p_to_date DATE DEFAULT CURRENT_DATE + 30` | `TABLE ( schedule_id UUID, doctor_id UUID, doctor_name TEXT, hospital_id UUID, hospital_name TEXT, scheduled_timezone TEXT, schedule_date DATE, start_time TIME, end_time TIME, shift_type TEXT, is_available BOOLEAN, updated_at TIMESTAMPTZ ) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` |
| `confirm_hospital_timezone` | `p_hospital_id UUID, p_timezone TEXT` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog` |
| `upsert_doctor_schedule` | `p_doctor_id UUID, p_date DATE, p_start_time TIME, p_end_time TIME, p_shift_type TEXT, p_is_available BOOLEAN DEFAULT true, p_schedule_id UUID DEFAULT NULL` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `delete_doctor_schedule` | `p_schedule_id UUID` | `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `ensure_async_consult_room` | `p_visit_id UUID` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `book_scheduled_visit` | `p_hospital_id UUID, p_specialty TEXT, p_care_mode TEXT, p_scheduled_start_at TIMESTAMPTZ, p_idempotency_key UUID, p_notes TEXT DEFAULT NULL` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `transition_scheduled_visit` | `p_visit_id UUID, p_action TEXT, p_scheduled_start_at TIMESTAMPTZ DEFAULT NULL, p_reason TEXT DEFAULT NULL` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `send_async_consult_message` | `p_room_id UUID, p_body TEXT, p_kind TEXT DEFAULT 'text', p_client_message_id TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::JSONB, p_attachment_storage_path TEXT DEFAULT NULL, p_attachment_mime_type TEXT DEFAULT NULL, p_attachment_size_bytes BIGINT DEFAULT NULL, p_attachment_duration_ms INTEGER DEFAULT NULL` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage` |
| `mark_async_consult_room_read` | `p_room_id UUID, p_message_id UUID DEFAULT NULL` | `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public` |
| `get_console_identity_projection` | `` | `JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` |
| `search_onboarding_facilities` | `p_query TEXT` | `TABLE ( id UUID, name TEXT, address TEXT, provider_type TEXT, verification_status TEXT, requires_support BOOLEAN ) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public` |
| `provision_console_organization` | `p_payload JSONB` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage` |
| `complete_console_user_invitation` | `p_target_user_id UUID, p_actor_user_id UUID, p_organization_id UUID, p_role TEXT, p_provider_type TEXT DEFAULT NULL` | `JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth` |
