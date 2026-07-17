export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          nda_signed_at: string | null
          signer_entity: string | null
          signer_name: string | null
          signer_title: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          nda_signed_at?: string | null
          signer_entity?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          nda_signed_at?: string | null
          signer_entity?: string | null
          signer_name?: string | null
          signer_title?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_staff_assignments: {
        Row: {
          ambulance_id: string
          assigned_by: string | null
          created_at: string
          duty_role: string
          end_reason: string | null
          ended_by: string | null
          ends_at: string | null
          id: string
          metadata: Json
          organization_id: string
          responder_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          ambulance_id: string
          assigned_by?: string | null
          created_at?: string
          duty_role?: string
          end_reason?: string | null
          ended_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          responder_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ambulance_id?: string
          assigned_by?: string | null
          created_at?: string
          duty_role?: string
          end_reason?: string | null
          ended_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          responder_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_staff_assignments_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_staff_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_staff_assignments_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_staff_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_staff_assignments_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          base_price: number | null
          call_sign: string | null
          created_at: string
          crew: Json | null
          current_call: string | null
          display_id: string | null
          eta: string | null
          heading: number | null
          hospital_id: string | null
          id: string
          license_plate: string | null
          location: unknown
          location_accuracy_meters: number | null
          location_observed_at: string | null
          location_received_at: string | null
          organization_id: string | null
          profile_id: string | null
          status: string | null
          telemetry_lease_expires_at: string | null
          telemetry_sequence: number
          type: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string
          crew?: Json | null
          current_call?: string | null
          display_id?: string | null
          eta?: string | null
          heading?: number | null
          hospital_id?: string | null
          id?: string
          license_plate?: string | null
          location?: unknown
          location_accuracy_meters?: number | null
          location_observed_at?: string | null
          location_received_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          status?: string | null
          telemetry_lease_expires_at?: string | null
          telemetry_sequence?: number
          type?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          base_price?: number | null
          call_sign?: string | null
          created_at?: string
          crew?: Json | null
          current_call?: string | null
          display_id?: string | null
          eta?: string | null
          heading?: number | null
          hospital_id?: string | null
          id?: string
          license_plate?: string | null
          location?: unknown
          location_accuracy_meters?: number | null
          location_observed_at?: string | null
          location_received_at?: string | null
          organization_id?: string | null
          profile_id?: string | null
          status?: string | null
          telemetry_lease_expires_at?: string | null
          telemetry_sequence?: number
          type?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_schedules: {
        Row: {
          created_at: string
          date: string
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          shift_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          shift_type: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          shift_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          about: string | null
          consultation_fee: string | null
          created_at: string
          current_patients: number | null
          department: string | null
          display_id: string | null
          email: string | null
          experience: number | null
          hospital_id: string | null
          id: string
          image: string | null
          is_available: boolean | null
          is_on_call: boolean | null
          license_number: string | null
          max_patients: number | null
          name: string
          phone: string | null
          profile_id: string | null
          rating: number | null
          reviews_count: number | null
          specialization: string
          status: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string
          current_patients?: number | null
          department?: string | null
          display_id?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_on_call?: boolean | null
          license_number?: string | null
          max_patients?: number | null
          name: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          consultation_fee?: string | null
          created_at?: string
          current_patients?: number | null
          department?: string | null
          display_id?: string | null
          email?: string | null
          experience?: number | null
          hospital_id?: string | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          is_on_call?: boolean | null
          license_number?: string | null
          max_patients?: number | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialization?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_invites: {
        Row: {
          claimed: boolean | null
          claimed_by: string | null
          created_at: string | null
          document_id: string
          email: string
          expires_at: string | null
          id: string
          token: string
        }
        Insert: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          document_id: string
          email: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Update: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          document_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_invites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          file_path: string
          icon: string | null
          id: string
          slug: string
          tier: string | null
          title: string
          updated_at: string | null
          visibility: string[] | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_path: string
          icon?: string | null
          id?: string
          slug: string
          tier?: string | null
          title: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string
          icon?: string | null
          id?: string
          slug?: string
          tier?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string[] | null
        }
        Relationships: []
      }
      emergency_chat_messages: {
        Row: {
          ai_assisted: boolean
          attachment_duration_ms: number | null
          attachment_mime_type: string | null
          attachment_size_bytes: number | null
          attachment_storage_path: string | null
          body: string
          client_message_id: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          kind: string
          metadata: Json
          room_id: string
          sender_id: string | null
          sender_role: string
          updated_at: string
        }
        Insert: {
          ai_assisted?: boolean
          attachment_duration_ms?: number | null
          attachment_mime_type?: string | null
          attachment_size_bytes?: number | null
          attachment_storage_path?: string | null
          body: string
          client_message_id?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          metadata?: Json
          room_id: string
          sender_id?: string | null
          sender_role: string
          updated_at?: string
        }
        Update: {
          ai_assisted?: boolean
          attachment_duration_ms?: number | null
          attachment_mime_type?: string | null
          attachment_size_bytes?: number | null
          attachment_storage_path?: string | null
          body?: string
          client_message_id?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          metadata?: Json
          room_id?: string
          sender_id?: string | null
          sender_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "emergency_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_chat_participants: {
        Row: {
          created_at: string
          display_name_snapshot: string | null
          id: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          role: string
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name_snapshot?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          role: string
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name_snapshot?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          role?: string
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_chat_participants_last_read_message_id_fkey"
            columns: ["room_id", "last_read_message_id"]
            isOneToOne: false
            referencedRelation: "emergency_chat_messages"
            referencedColumns: ["room_id", "id"]
          },
          {
            foreignKeyName: "emergency_chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "emergency_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_chat_rooms: {
        Row: {
          archived_at: string | null
          channel_type: string
          created_at: string
          created_by: string | null
          emergency_request_id: string | null
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          archived_at?: string | null
          channel_type?: string
          created_at?: string
          created_by?: string | null
          emergency_request_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          archived_at?: string | null
          channel_type?: string
          created_at?: string
          created_by?: string | null
          emergency_request_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_chat_rooms_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: true
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_chat_rooms_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          display_id: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          phone: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_doctor_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string
          doctor_id: string
          emergency_request_id: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          doctor_id: string
          emergency_request_id: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          doctor_id?: string
          emergency_request_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eda_emergency_request_fk"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_doctor_assignments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          ambulance_id: string | null
          ambulance_type: string | null
          assigned_doctor_id: string | null
          base_cost: number | null
          bed_count: string | null
          bed_number: string | null
          bed_type: string | null
          cancelled_at: string | null
          communication_room_id: string | null
          completed_at: string | null
          confirmed_cost: number | null
          cost_breakdown: Json | null
          created_at: string
          current_responder_assignment_id: string | null
          destination_location: unknown
          dispatch_organization_id: string | null
          display_id: string | null
          distance_surcharge: number | null
          doctor_assigned_at: string | null
          estimated_arrival: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          patient_acknowledged_arrival_at: string | null
          patient_heading: number | null
          patient_location: unknown
          patient_snapshot: Json | null
          payment_id: string | null
          payment_method_id: string | null
          payment_status: string | null
          pickup_location: unknown
          responder_heading: number | null
          responder_id: string | null
          responder_location: unknown
          responder_location_accuracy_meters: number | null
          responder_location_observed_at: string | null
          responder_location_received_at: string | null
          responder_name: string | null
          responder_phone: string | null
          responder_telemetry_lease_expires_at: string | null
          responder_telemetry_sequence: number | null
          responder_vehicle_plate: string | null
          responder_vehicle_type: string | null
          service_type: string
          shared_data_snapshot: Json | null
          specialty: string | null
          status: string
          total_cost: number | null
          updated_at: string
          urgency_surcharge: number | null
          user_id: string | null
        }
        Insert: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          assigned_doctor_id?: string | null
          base_cost?: number | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          communication_room_id?: string | null
          completed_at?: string | null
          confirmed_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          current_responder_assignment_id?: string | null
          destination_location?: unknown
          dispatch_organization_id?: string | null
          display_id?: string | null
          distance_surcharge?: number | null
          doctor_assigned_at?: string | null
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_acknowledged_arrival_at?: string | null
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_location?: unknown
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_location_accuracy_meters?: number | null
          responder_location_observed_at?: string | null
          responder_location_received_at?: string | null
          responder_name?: string | null
          responder_phone?: string | null
          responder_telemetry_lease_expires_at?: string | null
          responder_telemetry_sequence?: number | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type: string
          shared_data_snapshot?: Json | null
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
          user_id?: string | null
        }
        Update: {
          ambulance_id?: string | null
          ambulance_type?: string | null
          assigned_doctor_id?: string | null
          base_cost?: number | null
          bed_count?: string | null
          bed_number?: string | null
          bed_type?: string | null
          cancelled_at?: string | null
          communication_room_id?: string | null
          completed_at?: string | null
          confirmed_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string
          current_responder_assignment_id?: string | null
          destination_location?: unknown
          dispatch_organization_id?: string | null
          display_id?: string | null
          distance_surcharge?: number | null
          doctor_assigned_at?: string | null
          estimated_arrival?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          patient_acknowledged_arrival_at?: string | null
          patient_heading?: number | null
          patient_location?: unknown
          patient_snapshot?: Json | null
          payment_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_location?: unknown
          responder_heading?: number | null
          responder_id?: string | null
          responder_location?: unknown
          responder_location_accuracy_meters?: number | null
          responder_location_observed_at?: string | null
          responder_location_received_at?: string | null
          responder_name?: string | null
          responder_phone?: string | null
          responder_telemetry_lease_expires_at?: string | null
          responder_telemetry_sequence?: number | null
          responder_vehicle_plate?: string | null
          responder_vehicle_type?: string | null
          service_type?: string
          shared_data_snapshot?: Json | null
          specialty?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_communication_room_id_fkey"
            columns: ["communication_room_id"]
            isOneToOne: false
            referencedRelation: "emergency_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_current_responder_assignment_fkey"
            columns: ["current_responder_assignment_id"]
            isOneToOne: false
            referencedRelation: "emergency_responder_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_dispatch_organization_id_fkey"
            columns: ["dispatch_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_responder_assignments: {
        Row: {
          accepted_at: string | null
          ambulance_id: string
          arrived_at: string | null
          completed_at: string | null
          created_at: string
          decline_reason: string | null
          emergency_request_id: string
          ended_at: string | null
          id: string
          location_accuracy_meters: number | null
          location_observed_at: string | null
          location_received_at: string | null
          metadata: Json
          offer_expires_at: string
          offered_at: string
          offered_by: string | null
          organization_id: string
          responder_heading: number | null
          responder_id: string
          responder_location: unknown
          status: string
          telemetry_lease_expires_at: string | null
          telemetry_sequence: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          ambulance_id: string
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          emergency_request_id: string
          ended_at?: string | null
          id?: string
          location_accuracy_meters?: number | null
          location_observed_at?: string | null
          location_received_at?: string | null
          metadata?: Json
          offer_expires_at?: string
          offered_at?: string
          offered_by?: string | null
          organization_id: string
          responder_heading?: number | null
          responder_id: string
          responder_location?: unknown
          status?: string
          telemetry_lease_expires_at?: string | null
          telemetry_sequence?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          ambulance_id?: string
          arrived_at?: string | null
          completed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          emergency_request_id?: string
          ended_at?: string | null
          id?: string
          location_accuracy_meters?: number | null
          location_observed_at?: string | null
          location_received_at?: string | null
          metadata?: Json
          offer_expires_at?: string
          offered_at?: string
          offered_by?: string | null
          organization_id?: string
          responder_heading?: number | null
          responder_id?: string
          responder_location?: unknown
          status?: string
          telemetry_lease_expires_at?: string | null
          telemetry_sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_responder_assignments_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_responder_assignments_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_responder_assignments_offered_by_fkey"
            columns: ["offered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_responder_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_responder_assignments_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_status_transitions: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          emergency_request_id: string
          from_status: string | null
          id: string
          occurred_at: string
          reason: string
          request_snapshot: Json
          source: string
          to_status: string
          transition_metadata: Json
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string
          request_snapshot?: Json
          source?: string
          to_status: string
          transition_metadata?: Json
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          emergency_request_id?: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string
          request_snapshot?: Json
          source?: string
          to_status?: string
          transition_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "emergency_status_transitions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_status_transitions_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          metadata: Json | null
          quote_currency: string
          rate: number
          source: string
          stale_after: string | null
          updated_at: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          fetched_at?: string
          id?: string
          metadata?: Json | null
          quote_currency: string
          rate: number
          source?: string
          stale_after?: string | null
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          metadata?: Json | null
          quote_currency?: string
          rate?: number
          source?: string
          stale_after?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_news: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          published: boolean | null
          source: string
          title: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          source: string
          title: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean | null
          source?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      hospital_import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_count: number | null
          errors: Json | null
          id: string
          import_type: string
          imported_count: number | null
          location_lat: number | null
          location_lng: number | null
          radius_km: number | null
          search_query: string | null
          skipped_count: number | null
          status: string | null
          total_found: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          import_type: string
          imported_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          radius_km?: number | null
          search_query?: string | null
          skipped_count?: number | null
          status?: string | null
          total_found?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          errors?: Json | null
          id?: string
          import_type?: string
          imported_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          radius_km?: number | null
          search_query?: string | null
          skipped_count?: number | null
          status?: string | null
          total_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_import_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_media: {
        Row: {
          attribution_html: string | null
          attribution_required: boolean
          attribution_text: string | null
          confidence: number
          created_at: string
          hospital_id: string
          id: string
          is_primary: boolean
          media_role: string
          metadata: Json
          provider_photo_ref: string | null
          remote_url: string | null
          source_provider: string | null
          source_type: string
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          attribution_html?: string | null
          attribution_required?: boolean
          attribution_text?: string | null
          confidence?: number
          created_at?: string
          hospital_id: string
          id?: string
          is_primary?: boolean
          media_role?: string
          metadata?: Json
          provider_photo_ref?: string | null
          remote_url?: string | null
          source_provider?: string | null
          source_type: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          attribution_html?: string | null
          attribution_required?: boolean
          attribution_text?: string | null
          confidence?: number
          created_at?: string
          hospital_id?: string
          id?: string
          is_primary?: boolean
          media_role?: string
          metadata?: Json
          provider_photo_ref?: string | null
          remote_url?: string | null
          source_provider?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_media_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string
          ambulance_availability: Json | null
          ambulances_count: number | null
          available_beds: number | null
          base_price: number | null
          bed_availability: Json | null
          booking_eligible: boolean
          category_confidence: number | null
          coordinates: unknown
          created_at: string
          dispatch_eligible: boolean
          display_id: string | null
          emergency_eligible: boolean
          emergency_level: string | null
          emergency_wait_time_minutes: number | null
          features: string[] | null
          icu_beds_available: number | null
          id: string
          image: string | null
          image_attribution_text: string | null
          image_confidence: number | null
          image_source: string | null
          image_synced_at: string | null
          last_availability_update: string | null
          latitude: number | null
          longitude: number | null
          name: string
          org_admin_id: string | null
          organization_id: string | null
          phone: string | null
          place_id: string | null
          price_range: string | null
          provider_source: string | null
          provider_type: string
          rating: number | null
          service_types: string[] | null
          specialties: string[] | null
          status: string | null
          timezone: string
          timezone_confirmation_source: string | null
          timezone_confirmed_at: string | null
          timezone_confirmed_by: string | null
          total_beds: number | null
          type: string | null
          updated_at: string
          verification_status: string | null
          verified: boolean | null
          wait_time: string | null
        }
        Insert: {
          address: string
          ambulance_availability?: Json | null
          ambulances_count?: number | null
          available_beds?: number | null
          base_price?: number | null
          bed_availability?: Json | null
          booking_eligible?: boolean
          category_confidence?: number | null
          coordinates?: unknown
          created_at?: string
          dispatch_eligible?: boolean
          display_id?: string | null
          emergency_eligible?: boolean
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          icu_beds_available?: number | null
          id?: string
          image?: string | null
          image_attribution_text?: string | null
          image_confidence?: number | null
          image_source?: string | null
          image_synced_at?: string | null
          last_availability_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          provider_source?: string | null
          provider_type?: string
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          timezone?: string
          timezone_confirmation_source?: string | null
          timezone_confirmed_at?: string | null
          timezone_confirmed_by?: string | null
          total_beds?: number | null
          type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Update: {
          address?: string
          ambulance_availability?: Json | null
          ambulances_count?: number | null
          available_beds?: number | null
          base_price?: number | null
          bed_availability?: Json | null
          booking_eligible?: boolean
          category_confidence?: number | null
          coordinates?: unknown
          created_at?: string
          dispatch_eligible?: boolean
          display_id?: string | null
          emergency_eligible?: boolean
          emergency_level?: string | null
          emergency_wait_time_minutes?: number | null
          features?: string[] | null
          icu_beds_available?: number | null
          id?: string
          image?: string | null
          image_attribution_text?: string | null
          image_confidence?: number | null
          image_source?: string | null
          image_synced_at?: string | null
          last_availability_update?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_admin_id?: string | null
          organization_id?: string | null
          phone?: string | null
          place_id?: string | null
          price_range?: string | null
          provider_source?: string | null
          provider_type?: string
          rating?: number | null
          service_types?: string[] | null
          specialties?: string[] | null
          status?: string | null
          timezone?: string
          timezone_confirmation_source?: string | null
          timezone_confirmed_at?: string | null
          timezone_confirmed_by?: string | null
          total_beds?: number | null
          type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          wait_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitals_org_admin_id_fkey"
            columns: ["org_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitals_timezone_confirmed_by_fkey"
            columns: ["timezone_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_mappings: {
        Row: {
          created_at: string
          display_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string
          display_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string
          display_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      insurance_billing: {
        Row: {
          billing_date: string | null
          claim_number: string | null
          coverage_percentage: number | null
          created_at: string
          emergency_request_id: string | null
          hospital_id: string | null
          id: string
          insurance_amount: number
          insurance_policy_id: string | null
          paid_date: string | null
          status: string | null
          total_amount: number
          updated_at: string
          user_amount: number
          user_id: string | null
        }
        Insert: {
          billing_date?: string | null
          claim_number?: string | null
          coverage_percentage?: number | null
          created_at?: string
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          insurance_amount: number
          insurance_policy_id?: string | null
          paid_date?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
          user_amount: number
          user_id?: string | null
        }
        Update: {
          billing_date?: string | null
          claim_number?: string | null
          coverage_percentage?: number | null
          created_at?: string
          emergency_request_id?: string | null
          hospital_id?: string | null
          id?: string
          insurance_amount?: number
          insurance_policy_id?: string | null
          paid_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_billing_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_billing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          coverage_amount: number | null
          coverage_details: Json | null
          coverage_percentage: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          linked_payment_method: string | null
          plan_type: string | null
          policy_number: string | null
          policy_type: string | null
          provider: string | null
          provider_name: string
          starts_at: string | null
          status: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          coverage_amount?: number | null
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          linked_payment_method?: string | null
          plan_type?: string | null
          policy_number?: string | null
          policy_type?: string | null
          provider?: string | null
          provider_name: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          coverage_amount?: number | null
          coverage_details?: Json | null
          coverage_percentage?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          linked_payment_method?: string | null
          plan_type?: string | null
          policy_number?: string | null
          policy_type?: string | null
          provider?: string | null
          provider_name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ivisit_main_wallet: {
        Row: {
          balance: number | null
          currency: string | null
          id: string
          last_updated: string | null
        }
        Insert: {
          balance?: number | null
          currency?: string | null
          id?: string
          last_updated?: string | null
        }
        Update: {
          balance?: number | null
          currency?: string | null
          id?: string
          last_updated?: string | null
        }
        Relationships: []
      }
      medical_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          conditions: string[] | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emergency_notes: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          medications: string[] | null
          organ_donor: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_notes?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          conditions?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emergency_notes?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          color: string | null
          created_at: string
          dismissed_at: string | null
          display_id: string | null
          event_key: string | null
          icon: string | null
          id: string
          message: string | null
          metadata: Json | null
          priority: string | null
          read: boolean
          target_id: string | null
          timestamp: string
          title: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          color?: string | null
          created_at?: string
          dismissed_at?: string | null
          display_id?: string | null
          event_key?: string | null
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          color?: string | null
          created_at?: string
          dismissed_at?: string | null
          display_id?: string | null
          event_key?: string | null
          icon?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean
          target_id?: string | null
          timestamp?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_facility_claims: {
        Row: {
          claim_note: string | null
          created_at: string
          facility_id: string
          id: string
          organization_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          claim_note?: string | null
          created_at?: string
          facility_id: string
          id?: string
          organization_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          claim_note?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          organization_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_facility_claims_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_facility_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_facility_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_facility_claims_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_verification_documents: {
        Row: {
          created_at: string
          document_type: string
          facility_claim_id: string | null
          facility_id: string | null
          id: string
          mime_type: string
          organization_id: string
          original_name: string
          rejection_reason: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          facility_claim_id?: string | null
          facility_id?: string | null
          id?: string
          mime_type: string
          organization_id: string
          original_name: string
          rejection_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          facility_claim_id?: string | null
          facility_id?: string | null
          id?: string
          mime_type?: string
          organization_id?: string
          original_name?: string
          rejection_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_verification_documents_facility_claim_id_fkey"
            columns: ["facility_claim_id"]
            isOneToOne: false
            referencedRelation: "organization_facility_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verification_documents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verification_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verification_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verification_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_wallets: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          display_id: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_wallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          display_id: string | null
          fee_tier: string | null
          id: string
          is_active: boolean | null
          ivisit_fee_percentage: number | null
          name: string
          organization_type: string
          registration_number: string | null
          rejection_reason: string | null
          state: string | null
          stripe_account_id: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          display_id?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name: string
          organization_type?: string
          registration_number?: string | null
          rejection_reason?: string | null
          state?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          display_id?: string | null
          fee_tier?: string | null
          id?: string
          is_active?: boolean | null
          ivisit_fee_percentage?: number | null
          name?: string
          organization_type?: string
          registration_number?: string | null
          rejection_reason?: string | null
          state?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_wallets: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          display_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          display_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last4: string | null
          metadata: Json | null
          organization_id: string | null
          provider: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last4?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          display_id: string | null
          emergency_request_id: string | null
          id: string
          ivisit_fee_amount: number | null
          metadata: Json | null
          organization_id: string | null
          payment_method: string | null
          processed_at: string | null
          provider_response: Json | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          display_id?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_fee_amount?: number | null
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          provider_response?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          display_id?: string | null
          emergency_request_id?: string | null
          id?: string
          ivisit_fee_amount?: number | null
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          provider_response?: Json | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_emergency_request_id_fkey"
            columns: ["emergency_request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          appointment_reminders: boolean
          billing_country_code: string | null
          billing_currency_code: string | null
          created_at: string
          demo_mode_enabled: boolean
          emergency_updates: boolean
          notification_sounds_enabled: boolean
          notifications_enabled: boolean
          privacy_share_emergency_contacts: boolean
          privacy_share_medical_profile: boolean
          updated_at: string
          user_id: string
          view_preferences: Json | null
        }
        Insert: {
          appointment_reminders?: boolean
          billing_country_code?: string | null
          billing_currency_code?: string | null
          created_at?: string
          demo_mode_enabled?: boolean
          emergency_updates?: boolean
          notification_sounds_enabled?: boolean
          notifications_enabled?: boolean
          privacy_share_emergency_contacts?: boolean
          privacy_share_medical_profile?: boolean
          updated_at?: string
          user_id: string
          view_preferences?: Json | null
        }
        Update: {
          appointment_reminders?: boolean
          billing_country_code?: string | null
          billing_currency_code?: string | null
          created_at?: string
          demo_mode_enabled?: boolean
          emergency_updates?: boolean
          notification_sounds_enabled?: boolean
          notifications_enabled?: boolean
          privacy_share_emergency_contacts?: boolean
          privacy_share_medical_profile?: boolean
          updated_at?: string
          user_id?: string
          view_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          assigned_ambulance_id: string | null
          avatar_url: string | null
          bvn_verified: boolean | null
          created_at: string
          date_of_birth: string | null
          display_id: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          image_uri: string | null
          ivisit_fee_percentage: number | null
          last_name: string | null
          onboarding_status: string | null
          organization_id: string | null
          organization_name: string | null
          payout_method_brand: string | null
          payout_method_id: string | null
          payout_method_last4: string | null
          phone: string | null
          provider_type: string | null
          role: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          address?: string | null
          assigned_ambulance_id?: string | null
          avatar_url?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          display_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          image_uri?: string | null
          ivisit_fee_percentage?: number | null
          last_name?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          organization_name?: string | null
          payout_method_brand?: string | null
          payout_method_id?: string | null
          payout_method_last4?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          address?: string | null
          assigned_ambulance_id?: string | null
          avatar_url?: string | null
          bvn_verified?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          display_id?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          image_uri?: string | null
          ivisit_fee_percentage?: number | null
          last_name?: string | null
          onboarding_status?: string | null
          organization_id?: string | null
          organization_name?: string | null
          payout_method_brand?: string | null
          payout_method_id?: string | null
          payout_method_last4?: string | null
          phone?: string | null
          provider_type?: string | null
          role?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          age_range: string | null
          appointment_required: boolean | null
          created_at: string | null
          crisis_line: string | null
          hospital_id: string
          id: string
          insurance_accepted: string[] | null
          provider_services: Json | null
          provider_specialties: Json | null
          provider_type: string
          report_turnaround: string | null
          structured_hours: Json | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          appointment_required?: boolean | null
          created_at?: string | null
          crisis_line?: string | null
          hospital_id: string
          id?: string
          insurance_accepted?: string[] | null
          provider_services?: Json | null
          provider_specialties?: Json | null
          provider_type: string
          report_turnaround?: string | null
          structured_hours?: Json | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          appointment_required?: boolean | null
          created_at?: string | null
          crisis_line?: string | null
          hospital_id?: string
          id?: string
          insurance_accepted?: string[] | null
          provider_services?: Json | null
          provider_specialties?: Json | null
          provider_type?: string
          report_turnaround?: string | null
          structured_hours?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      room_pricing: {
        Row: {
          created_at: string | null
          description: string | null
          hospital_id: string | null
          id: string
          price_per_night: number
          room_name: string
          room_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          price_per_night?: number
          room_name: string
          room_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          price_per_night?: number
          room_name?: string
          room_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_pricing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      search_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          query: string | null
          selected_key: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          query?: string | null
          selected_key?: string | null
          source?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_selections: {
        Row: {
          created_at: string
          id: string
          query: string
          result_id: string
          result_type: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_id: string
          result_type: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_id?: string
          result_type?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          hospital_id: string | null
          id: string
          service_name: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          service_name: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          hospital_id?: string | null
          id?: string
          service_name?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stripe_webhook_event_receipts: {
        Row: {
          attempts: number
          claim_token: string | null
          completed_at: string | null
          created_at: string
          event_type: string
          failed_at: string | null
          first_received_at: string
          id: string
          last_error: string | null
          last_received_at: string
          lease_expires_at: string | null
          processing_started_at: string
          status: string
          stripe_account_id: string | null
          stripe_event_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          event_type: string
          failed_at?: string | null
          first_received_at?: string
          id?: string
          last_error?: string | null
          last_received_at?: string
          lease_expires_at?: string | null
          processing_started_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_event_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          event_type?: string
          failed_at?: string | null
          first_received_at?: string
          id?: string
          last_error?: string | null
          last_received_at?: string
          lease_expires_at?: string | null
          processing_started_at?: string
          status?: string
          stripe_account_id?: string | null
          stripe_event_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          last_engagement_at: string | null
          metadata: Json | null
          new_user: boolean | null
          sale_id: string | null
          source: string | null
          status: string | null
          subscription_date: string | null
          type: string | null
          unsubscribed_at: string | null
          updated_at: string
          welcome_email_sent: boolean | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_engagement_at?: string | null
          metadata?: Json | null
          new_user?: boolean | null
          sale_id?: string | null
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_engagement_at?: string | null
          metadata?: Json | null
          new_user?: boolean | null
          sale_id?: string | null
          source?: string | null
          status?: string | null
          subscription_date?: string | null
          type?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      support_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          question: string
          rank: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
          rank?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          rank?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          organization_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_topics: {
        Row: {
          category: string
          created_at: string
          id: string
          query: string
          rank: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          query: string
          rank: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          query?: string
          rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          last_active: string | null
          session_data: Json | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_active?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_active?: string | null
          session_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          address: string | null
          booking_idempotency_key: string | null
          care_mode: string | null
          cost: string | null
          created_at: string
          date: string | null
          display_id: string | null
          doctor: string | null
          doctor_id: string | null
          doctor_image: string | null
          doctor_name: string | null
          estimated_duration: string | null
          hospital: string | null
          hospital_id: string | null
          hospital_image: string | null
          hospital_name: string | null
          id: string
          image: string | null
          insurance_covered: boolean | null
          latitude: number | null
          lifecycle_state: string | null
          lifecycle_updated_at: string | null
          longitude: number | null
          meeting_link: string | null
          next_visit: string | null
          notes: string | null
          phone: string | null
          preparation: string[] | null
          prescriptions: string[] | null
          rated_at: string | null
          rating: number | null
          rating_comment: string | null
          request_id: string | null
          room_number: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          scheduled_timezone: string | null
          specialty: string | null
          status: string | null
          summary: string | null
          time: string | null
          tip_amount: number | null
          tip_currency: string | null
          tip_payment_id: string | null
          tipped_at: string | null
          type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          booking_idempotency_key?: string | null
          care_mode?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          display_id?: string | null
          doctor?: string | null
          doctor_id?: string | null
          doctor_image?: string | null
          doctor_name?: string | null
          estimated_duration?: string | null
          hospital?: string | null
          hospital_id?: string | null
          hospital_image?: string | null
          hospital_name?: string | null
          id?: string
          image?: string | null
          insurance_covered?: boolean | null
          latitude?: number | null
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          longitude?: number | null
          meeting_link?: string | null
          next_visit?: string | null
          notes?: string | null
          phone?: string | null
          preparation?: string[] | null
          prescriptions?: string[] | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          room_number?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          scheduled_timezone?: string | null
          specialty?: string | null
          status?: string | null
          summary?: string | null
          time?: string | null
          tip_amount?: number | null
          tip_currency?: string | null
          tip_payment_id?: string | null
          tipped_at?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          booking_idempotency_key?: string | null
          care_mode?: string | null
          cost?: string | null
          created_at?: string
          date?: string | null
          display_id?: string | null
          doctor?: string | null
          doctor_id?: string | null
          doctor_image?: string | null
          doctor_name?: string | null
          estimated_duration?: string | null
          hospital?: string | null
          hospital_id?: string | null
          hospital_image?: string | null
          hospital_name?: string | null
          id?: string
          image?: string | null
          insurance_covered?: boolean | null
          latitude?: number | null
          lifecycle_state?: string | null
          lifecycle_updated_at?: string | null
          longitude?: number | null
          meeting_link?: string | null
          next_visit?: string | null
          notes?: string | null
          phone?: string | null
          preparation?: string[] | null
          prescriptions?: string[] | null
          rated_at?: string | null
          rating?: number | null
          rating_comment?: string | null
          request_id?: string | null
          room_number?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          scheduled_timezone?: string | null
          specialty?: string | null
          status?: string | null
          summary?: string | null
          time?: string | null
          tip_amount?: number | null
          tip_currency?: string | null
          tip_payment_id?: string | null
          tipped_at?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_tip_payment_id_fkey"
            columns: ["tip_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          external_reference: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          reference_id: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reference_id?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reference_id?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_update_trending_topics: { Args: { payload: Json }; Returns: Json }
      ambulance_dispatch_readiness_snapshot: {
        Args: { p_ambulance_id: string; p_request_id?: string }
        Returns: Json
      }
      apply_stripe_payout_paid: {
        Args: {
          p_amount: number
          p_payout_id: string
          p_provider_response?: Json
          p_stripe_account_id: string
        }
        Returns: Json
      }
      approve_cash_payment: {
        Args: { p_payment_id: string; p_request_id: string }
        Returns: Json
      }
      assign_ambulance_to_emergency: {
        Args: {
          p_ambulance_id: string
          p_emergency_request_id: string
          p_priority?: number
        }
        Returns: Json
      }
      assign_doctor_to_emergency: {
        Args: {
          p_doctor_id: string
          p_emergency_request_id: string
          p_notes?: string
        }
        Returns: Json
      }
      auto_assign_ambulance: {
        Args: {
          p_emergency_request_id: string
          p_max_distance_km?: number
          p_specialty_required?: string
        }
        Returns: Json
      }
      book_scheduled_visit: {
        Args: {
          p_care_mode: string
          p_hospital_id: string
          p_idempotency_key: string
          p_notes?: string
          p_scheduled_start_at: string
          p_specialty: string
        }
        Returns: Json
      }
      calculate_ambulance_eta: {
        Args: {
          p_ambulance_id: string
          p_destination_lat: number
          p_destination_lng: number
        }
        Returns: Json
      }
      calculate_emergency_cost_v2: {
        Args: {
          p_ambulance_type?: string
          p_distance_km?: number
          p_hospital_id?: string
          p_service_type: string
        }
        Returns: Json
      }
      cancel_bed_reservation: {
        Args: { request_uuid: string }
        Returns: boolean
      }
      cancel_trip: { Args: { request_uuid: string }; Returns: boolean }
      canonicalize_emergency_status: {
        Args: { p_default?: string; p_status: string }
        Returns: string
      }
      check_cash_eligibility: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      claim_stripe_webhook_event: {
        Args: {
          p_event_type: string
          p_stripe_account_id?: string
          p_stripe_event_id: string
        }
        Returns: Json
      }
      complete_card_payment: {
        Args: {
          p_fee_amount?: number
          p_payment_intent_id: string
          p_provider_response?: Json
        }
        Returns: Json
      }
      complete_console_user_invitation: {
        Args: {
          p_actor_user_id: string
          p_organization_id: string
          p_provider_type?: string
          p_role: string
          p_target_user_id: string
        }
        Returns: Json
      }
      complete_stripe_webhook_event: {
        Args: { p_claim_token: string; p_stripe_event_id: string }
        Returns: Json
      }
      complete_trip: { Args: { request_uuid: string }; Returns: boolean }
      confirm_hospital_timezone: {
        Args: { p_hospital_id: string; p_timezone: string }
        Returns: Json
      }
      console_accept_bed_emergency: {
        Args: {
          p_bed_number?: string
          p_hospital_id?: string
          p_request_id: string
        }
        Returns: Json
      }
      console_cancel_emergency: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: Json
      }
      console_complete_emergency: {
        Args: { p_request_id: string }
        Returns: Json
      }
      console_create_emergency_request: {
        Args: { p_payload: Json }
        Returns: Json
      }
      console_dispatch_emergency: {
        Args: {
          p_ambulance_id: string
          p_bed_number?: string
          p_hospital_id?: string
          p_hospital_name?: string
          p_request_id: string
          p_responder_name?: string
          p_responder_phone?: string
          p_responder_vehicle_plate?: string
          p_responder_vehicle_type?: string
        }
        Returns: Json
      }
      console_update_emergency_request: {
        Args: { p_payload: Json; p_request_id: string }
        Returns: Json
      }
      console_update_responder_location: {
        Args: { p_heading?: number; p_location: Json; p_request_id: string }
        Returns: Json
      }
      convert_currency_for_payment: {
        Args: {
          p_amount: number
          p_from_currency?: string
          p_to_currency?: string
        }
        Returns: Json
      }
      create_emergency_v4: {
        Args: { p_payment_data?: Json; p_request_data: Json; p_user_id: string }
        Returns: Json
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_permission_level: { Args: never; Returns: string }
      decline_cash_payment: {
        Args: { p_payment_id: string; p_request_id: string }
        Returns: Json
      }
      delete_doctor_schedule: {
        Args: { p_schedule_id: string }
        Returns: boolean
      }
      delete_hospital_by_admin: {
        Args: { target_hospital_id: string }
        Returns: Json
      }
      delete_room_pricing: { Args: { target_id: string }; Returns: Json }
      delete_service_pricing: { Args: { target_id: string }; Returns: Json }
      delete_user: { Args: never; Returns: Json }
      delete_user_by_admin: { Args: { target_user_id: string }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      discharge_patient: { Args: { request_uuid: string }; Returns: boolean }
      dispatcher_release_responder_assignment: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      emergency_dispatch_payment_snapshot: {
        Args: { p_request_id: string }
        Returns: Json
      }
      emit_canonical_notification: {
        Args: {
          p_action_data?: Json
          p_action_type?: string
          p_color?: string
          p_event_key: string
          p_icon?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_recipient_user_id: string
          p_target_id?: string
          p_title: string
          p_type: string
        }
        Returns: Json
      }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_async_consult_room: { Args: { p_visit_id: string }; Returns: Json }
      ensure_emergency_chat_room: {
        Args: { p_request_id: string }
        Returns: Json
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      exec_sql: { Args: { sql: string }; Returns: Json }
      expire_responder_offers: { Args: { p_limit?: number }; Returns: Json }
      fail_card_payment: {
        Args: {
          p_failure_reason?: string
          p_payment_intent_id: string
          p_provider_response?: Json
        }
        Returns: Json
      }
      fail_stripe_webhook_event: {
        Args: {
          p_claim_token: string
          p_last_error: string
          p_stripe_event_id: string
        }
        Returns: Json
      }
      generate_display_id: { Args: { prefix: string }; Returns: string }
      generate_username_from_email: {
        Args: { email_input: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_activity_stats: { Args: { days_back?: number }; Returns: Json }
      get_all_auth_users: {
        Args: { p_organization_id?: string }
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          phone: string
          profile_bvn_verified: boolean
          profile_display_id: string
          profile_first_name: string
          profile_full_name: string
          profile_last_name: string
          profile_organization_id: string
          profile_provider_type: string
          profile_role: string
          profile_username: string
          raw_user_meta_data: Json
        }[]
      }
      get_ambulance_dispatch_readiness: {
        Args: { p_ambulance_id: string; p_request_id?: string }
        Returns: Json
      }
      get_ambulance_status: { Args: { p_ambulance_id: string }; Returns: Json }
      get_available_ambulances: {
        Args: {
          p_hospital_id?: string
          p_radius_km?: number
          p_specialty?: string
        }
        Returns: {
          base_price: number
          call_sign: string
          created_at: string
          crew: Json
          display_id: string
          hospital_id: string
          id: string
          profile_id: string
          status: string
          type: string
          updated_at: string
          vehicle_number: string
        }[]
      }
      get_available_doctors: {
        Args: { p_hospital_id: string; p_specialty?: string }
        Returns: {
          availability_status: string
          current_patients: number
          doctor_id: string
          doctor_name: string
          max_patients: number
          specialty: string
        }[]
      }
      get_billing_quote: {
        Args: {
          p_amount_usd: number
          p_target_country_code?: string
          p_target_currency_code?: string
        }
        Returns: Json
      }
      get_book_visit_availability: {
        Args: {
          p_care_mode: string
          p_from_at?: string
          p_hospital_id: string
          p_specialty: string
          p_to_at?: string
        }
        Returns: {
          care_mode: string
          doctor_id: string
          doctor_image: string
          doctor_name: string
          hospital_id: string
          scheduled_end_at: string
          scheduled_start_at: string
          scheduled_timezone: string
          specialty: string
        }[]
      }
      get_console_doctor_schedules: {
        Args: {
          p_from_date?: string
          p_hospital_id?: string
          p_to_date?: string
        }
        Returns: {
          doctor_id: string
          doctor_name: string
          end_time: string
          hospital_id: string
          hospital_name: string
          is_available: boolean
          schedule_date: string
          schedule_id: string
          scheduled_timezone: string
          shift_type: string
          start_time: string
          updated_at: string
        }[]
      }
      get_console_identity_projection: { Args: never; Returns: Json }
      get_current_emergency_responder: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_driver_dispatch_feed: { Args: never; Returns: Json }
      get_eligible_ambulance_responders: {
        Args: { p_organization_id?: string }
        Returns: {
          active_request_id: string
          display_id: string
          full_name: string
          is_available: boolean
          linked_ambulance_id: string
          phone: string
          provider_type: string
          responder_id: string
        }[]
      }
      get_emergency_medical_data: { Args: { p_user_id: string }; Returns: Json }
      get_entity_id: { Args: { p_display_id: string }; Returns: string }
      get_insurance_policies: {
        Args: { p_include_inactive?: boolean; p_user_id: string }
        Returns: Json
      }
      get_medical_summary: { Args: { p_user_id: string }; Returns: Json }
      get_org_stripe_status: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_recent_activity: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          action: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          user_id: string
        }[]
      }
      get_responder_telemetry_state: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_room_price: {
        Args: { p_hospital_id?: string; p_room_type: string }
        Returns: {
          currency: string
          price: number
          room_name: string
        }[]
      }
      get_search_analytics: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          last_searched: string
          query: string
          rank: number
          search_count: number
          unique_users: number
        }[]
      }
      get_search_analytics_summary: {
        Args: { days_back?: number }
        Returns: {
          avg_searches_per_user: number
          top_query: string
          total_searches: number
          unique_queries: number
          unique_searchers: number
        }[]
      }
      get_service_price: {
        Args: { p_hospital_id?: string; p_service_type: string }
        Returns: {
          currency: string
          price: number
          service_name: string
        }[]
      }
      get_trending_searches: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          category: string
          id: string
          query: string
          rank: number
        }[]
      }
      get_user_statistics: {
        Args: never
        Returns: {
          admin_count: number
          dispatcher_count: number
          email_verified_users: number
          org_admin_count: number
          patient_count: number
          phone_verified_users: number
          provider_count: number
          recent_signups: number
          sponsor_count: number
          total_profiles: number
          total_users: number
          viewer_count: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_valid_emergency_status_transition: {
        Args: { p_current_status: string; p_next_status: string }
        Returns: boolean
      }
      jsonb_to_point_geometry: { Args: { p_location: Json }; Returns: unknown }
      log_user_activity: {
        Args: {
          p_action: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_async_consult_room_read: {
        Args: { p_message_id?: string; p_room_id: string }
        Returns: boolean
      }
      mark_emergency_chat_room_read: {
        Args: { p_message_id?: string; p_room_id: string }
        Returns: boolean
      }
      nearby_ambulances: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          call_sign: string
          display_id: string
          distance: number
          id: string
          latitude: number
          longitude: number
          status: string
        }[]
      }
      nearby_hospitals: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          address: string
          category_confidence: number
          dispatch_eligible: boolean
          display_id: string
          distance: number
          emergency_eligible: boolean
          id: string
          latitude: number
          longitude: number
          name: string
          provider_source: string
          provider_type: string
          status: string
          verification_status: string
          verified: boolean
        }[]
      }
      nearby_providers: {
        Args: {
          provider_type_filter?: string
          radius_km?: number
          result_limit?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          address: string
          booking_eligible: boolean
          category_confidence: number
          dispatch_eligible: boolean
          display_id: string
          distance: number
          emergency_eligible: boolean
          id: string
          image: string
          latitude: number
          longitude: number
          name: string
          phone: string
          place_id: string
          provider_source: string
          provider_type: string
          rating: number
          status: string
          verification_status: string
          verified: boolean
        }[]
      }
      notify_cash_approval_org_admins: {
        Args: {
          p_display_id?: string
          p_fee_amount?: number
          p_hospital_name?: string
          p_organization_id?: string
          p_payment_id: string
          p_request_id: string
          p_service_type?: string
          p_total_amount?: number
        }
        Returns: Json
      }
      notify_cash_approval_org_admins_internal: {
        Args: {
          p_display_id?: string
          p_fee_amount?: number
          p_hospital_name?: string
          p_organization_id?: string
          p_payment_id: string
          p_request_id: string
          p_service_type?: string
          p_total_amount?: number
        }
        Returns: Json
      }
      offer_responder_assignment: {
        Args: {
          p_ambulance_id: string
          p_offered_by?: string
          p_request_id: string
          p_source?: string
        }
        Returns: Json
      }
      p_can_manage_doctor_schedule: {
        Args: { p_doctor_id: string }
        Returns: boolean
      }
      p_get_current_org_id: { Args: never; Returns: string }
      p_is_admin: { Args: never; Returns: boolean }
      p_is_async_consult_participant: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      p_is_console_allowed: { Args: never; Returns: boolean }
      p_is_emergency_chat_participant: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      p_safe_uuid: { Args: { p_value: string }; Returns: string }
      p_scheduled_visit_duration: {
        Args: { p_care_mode: string }
        Returns: string
      }
      p_select_bookable_doctor: {
        Args: {
          p_care_mode: string
          p_exclude_visit_id?: string
          p_hospital_id: string
          p_scheduled_end_at: string
          p_scheduled_start_at: string
          p_specialty: string
        }
        Returns: string
      }
      patient_acknowledge_responder_arrival: {
        Args: { p_request_id: string }
        Returns: Json
      }
      patient_update_emergency_request: {
        Args: { p_payload?: Json; p_request_id: string }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_cash_payment: {
        Args: {
          p_amount: number
          p_emergency_request_id: string
          p_organization_id: string
        }
        Returns: Json
      }
      process_cash_payment_v2: {
        Args: {
          p_amount: number
          p_currency?: string
          p_emergency_request_id: string
          p_organization_id: string
        }
        Returns: Json
      }
      process_insurance_claim: {
        Args: {
          p_actual_cost: number
          p_emergency_request_id: string
          p_hospital_id: string
          p_user_id: string
        }
        Returns: Json
      }
      process_visit_tip: {
        Args: { p_currency?: string; p_tip_amount: number; p_visit_id: string }
        Returns: Json
      }
      process_wallet_payment:
        | {
            Args: {
              p_amount: number
              p_emergency_request_id?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_emergency_request_id: string
              p_organization_id: string
              p_user_id: string
            }
            Returns: Json
          }
      provision_console_organization: {
        Args: { p_payload: Json }
        Returns: Json
      }
      review_console_facility_claim: {
        Args: { p_claim_id: string; p_decision: string; p_note?: string }
        Returns: Json
      }
      review_console_organization: {
        Args: {
          p_decision: string
          p_note?: string
          p_organization_id: string
        }
        Returns: Json
      }
      review_organization_verification_document: {
        Args: { p_decision: string; p_document_id: string; p_note?: string }
        Returns: Json
      }
      rate_visit: {
        Args: { p_comment?: string; p_rating: number; p_visit_id: string }
        Returns: Json
      }
      skip_visit_rating: {
        Args: { p_visit_id: string }
        Returns: Json
      }
      record_visit_cash_tip: {
        Args: { p_currency?: string; p_tip_amount: number; p_visit_id: string }
        Returns: Json
      }
      release_current_responder_assignment: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_disposition: string
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      reload_schema: { Args: never; Returns: undefined }
      report_responder_telemetry: { Args: { p_payload: Json }; Returns: Json }
      resolve_currency_for_country: {
        Args: { p_country_code: string }
        Returns: string
      }
      responder_accept_emergency: {
        Args: { p_request_id: string }
        Returns: Json
      }
      responder_arrive_emergency: {
        Args: { p_request_id: string }
        Returns: Json
      }
      responder_complete_emergency: {
        Args: { p_request_id: string }
        Returns: Json
      }
      responder_decline_emergency: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      retry_payment_with_different_method: {
        Args: {
          p_emergency_request_id: string
          p_new_payment_method_id: string
          p_user_id: string
        }
        Returns: Json
      }
      search_auth_users: {
        Args: { search_term: string }
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          phone: string
          raw_user_meta_data: Json
        }[]
      }
      search_onboarding_facilities: {
        Args: { p_query: string }
        Returns: {
          address: string
          claim_status: string | null
          claimable: boolean
          id: string
          name: string
          ownership_state: string
          provider_type: string
          requires_support: boolean
          verification_status: string
        }[]
      }
      send_async_consult_message: {
        Args: {
          p_attachment_duration_ms?: number
          p_attachment_mime_type?: string
          p_attachment_size_bytes?: number
          p_attachment_storage_path?: string
          p_body: string
          p_client_message_id?: string
          p_kind?: string
          p_metadata?: Json
          p_room_id: string
        }
        Returns: Json
      }
      send_emergency_chat_message: {
        Args: {
          p_body: string
          p_client_message_id?: string
          p_kind?: string
          p_metadata?: Json
          p_room_id: string
        }
        Returns: Json
      }
      set_emergency_transition_context: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_allow_status_write?: boolean
          p_metadata?: Json
          p_reason?: string
          p_source: string
        }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      staff_ambulance_responder: {
        Args: { p_ambulance_id: string; p_responder_id: string }
        Returns: Json
      }
      track_emergency_progress: {
        Args: { p_emergency_request_id: string }
        Returns: Json
      }
      transition_scheduled_visit: {
        Args: {
          p_action: string
          p_reason?: string
          p_scheduled_start_at?: string
          p_visit_id: string
        }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_ambulance_location: {
        Args: {
          p_accuracy?: number
          p_ambulance_id: string
          p_latitude: number
          p_longitude: number
        }
        Returns: Json
      }
      update_ambulance_status: {
        Args: {
          p_ambulance_id: string
          p_current_call?: string
          p_eta?: string
          p_location?: Json
          p_status: string
        }
        Returns: Json
      }
      update_hospital_availability: {
        Args: {
          ambulance_count: number
          beds_available: number
          er_wait_time: number
          hospital_id: string
          p_status: string
        }
        Returns: boolean
      }
      update_hospital_by_admin: {
        Args: { payload: Json; target_hospital_id: string }
        Returns: Json
      }
      update_medical_profile: {
        Args: { p_medical_data: Json; p_user_id: string }
        Returns: Json
      }
      update_profile_by_admin: {
        Args: { profile_data: Json; target_user_id: string }
        Returns: Json
      }
      update_trending_topics_from_search: { Args: never; Returns: Json }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_doctor_schedule: {
        Args: {
          p_date: string
          p_doctor_id: string
          p_end_time: string
          p_is_available?: boolean
          p_schedule_id?: string
          p_shift_type: string
          p_start_time: string
        }
        Returns: Json
      }
      upsert_room_pricing: { Args: { payload: Json }; Returns: Json }
      upsert_service_pricing: { Args: { payload: Json }; Returns: Json }
      validate_emergency_request: {
        Args: { p_request_data: Json; p_user_id: string }
        Returns: Json
      }
      validate_insurance_coverage: {
        Args: {
          p_estimated_cost: number
          p_hospital_id: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_medical_profile: {
        Args: { p_medical_data: Json; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
