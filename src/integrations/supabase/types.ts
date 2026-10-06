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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      asset_classes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_listings: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          description: string | null
          id: string
          location_id: string | null
          price_minor: number | null
          seller_customer_id: string | null
          seller_supplier_id: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          price_minor?: number | null
          seller_customer_id?: string | null
          seller_supplier_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          price_minor?: number | null
          seller_customer_id?: string | null
          seller_supplier_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "customer_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_listings_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "asset_listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_listings_seller_customer_id_fkey"
            columns: ["seller_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_listings_seller_supplier_id_fkey"
            columns: ["seller_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          ai_confidence: number | null
          ai_model: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hmac: string | null
          new_value: Json | null
          previous_value: Json | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          ai_confidence?: number | null
          ai_model?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hmac?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          ai_confidence?: number | null
          ai_model?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hmac?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      breakdown_events: {
        Row: {
          asset_id: string | null
          channel: string
          corridor_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          fault_type_id: string | null
          geog: unknown
          id: string
          location_id: string | null
          reported_at: string
          reported_by: string | null
          system_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          channel?: string
          corridor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          fault_type_id?: string | null
          geog?: unknown
          id?: string
          location_id?: string | null
          reported_at?: string
          reported_by?: string | null
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          channel?: string
          corridor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          fault_type_id?: string | null
          geog?: unknown
          id?: string
          location_id?: string | null
          reported_at?: string
          reported_by?: string | null
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdown_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "customer_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_events_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "location_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_events_fault_type_id_fkey"
            columns: ["fault_type_id"]
            isOneToOne: false
            referencedRelation: "fault_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakdown_events_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"] | null
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          revoked_at: string | null
          source: string | null
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          consent_type: string
          created_at?: string
          granted: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          currency_code: string
          dialing_code: string | null
          driving_side: Database["public"]["Enums"]["driving_side"]
          id: string
          iso2: string
          name: string
          observes_dst: boolean
          status: Database["public"]["Enums"]["country_status"]
          timezone: string
          updated_at: string
          utc_offset_minutes: number
        }
        Insert: {
          created_at?: string
          currency_code: string
          dialing_code?: string | null
          driving_side: Database["public"]["Enums"]["driving_side"]
          id?: string
          iso2: string
          name: string
          observes_dst?: boolean
          status?: Database["public"]["Enums"]["country_status"]
          timezone: string
          updated_at?: string
          utc_offset_minutes?: number
        }
        Update: {
          created_at?: string
          currency_code?: string
          dialing_code?: string | null
          driving_side?: Database["public"]["Enums"]["driving_side"]
          id?: string
          iso2?: string
          name?: string
          observes_dst?: boolean
          status?: Database["public"]["Enums"]["country_status"]
          timezone?: string
          updated_at?: string
          utc_offset_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          minor_units: number
          name: string
          symbol: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          minor_units?: number
          name: string
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          minor_units?: number
          name?: string
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_assets: {
        Row: {
          asset_class_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          fleet_number: string | null
          id: string
          make_id: string | null
          metadata: Json
          model_id: string | null
          registration: string | null
          telematics_device_id: string | null
          updated_at: string
          updated_by: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          asset_class_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          fleet_number?: string | null
          id?: string
          make_id?: string | null
          metadata?: Json
          model_id?: string | null
          registration?: string | null
          telematics_device_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          asset_class_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          fleet_number?: string | null
          id?: string
          make_id?: string | null
          metadata?: Json
          model_id?: string | null
          registration?: string | null
          telematics_device_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_assets_asset_class_id_fkey"
            columns: ["asset_class_id"]
            isOneToOne: false
            referencedRelation: "asset_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assets_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          doc_type: string
          expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          doc_type: string
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          doc_type?: string
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_members: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          member_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          member_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          member_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          country_code: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          primary_contact_user_id: string | null
          registration_number: string | null
          subtype: Database["public"]["Enums"]["customer_subtype"]
          tax_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_address?: string | null
          country_code: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          primary_contact_user_id?: string | null
          registration_number?: string | null
          subtype: Database["public"]["Enums"]["customer_subtype"]
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_address?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          primary_contact_user_id?: string | null
          registration_number?: string | null
          subtype?: Database["public"]["Enums"]["customer_subtype"]
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          as_at: string
          base_currency: string
          created_at: string
          created_by: string | null
          id: string
          quote_currency: string
          rate: number
          source: string
          updated_at: string
        }
        Insert: {
          as_at: string
          base_currency: string
          created_at?: string
          created_by?: string | null
          id?: string
          quote_currency: string
          rate: number
          source: string
          updated_at?: string
        }
        Update: {
          as_at?: string
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          quote_currency?: string
          rate?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_currency_fkey"
            columns: ["quote_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      fault_types: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          severity: number
          system_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          severity?: number
          system_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          severity?: number
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_types_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          phase: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          phase?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          phase?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total_minor: number
          quantity: number
          tax_rate_bps: number
          unit_amount_minor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total_minor: number
          quantity?: number
          tax_rate_bps?: number
          unit_amount_minor: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total_minor?: number
          quantity?: number
          tax_rate_bps?: number
          unit_amount_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string | null
          due_at: string | null
          exchange_rate: number
          exchange_rate_as_at: string
          exchange_rate_id: string | null
          id: string
          issued_at: string | null
          issuing_entity_id: string
          job_id: string | null
          number: string
          receiving_entity_id: string
          settlement_currency_code: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_minor: number
          supplier_id: string | null
          tax_minor: number
          total_minor: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_code: string
          customer_id?: string | null
          due_at?: string | null
          exchange_rate: number
          exchange_rate_as_at: string
          exchange_rate_id?: string | null
          id?: string
          issued_at?: string | null
          issuing_entity_id: string
          job_id?: string | null
          number: string
          receiving_entity_id: string
          settlement_currency_code: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_minor?: number
          supplier_id?: string | null
          tax_minor?: number
          total_minor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          due_at?: string | null
          exchange_rate?: number
          exchange_rate_as_at?: string
          exchange_rate_id?: string | null
          id?: string
          issued_at?: string | null
          issuing_entity_id?: string
          job_id?: string | null
          number?: string
          receiving_entity_id?: string
          settlement_currency_code?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_minor?: number
          supplier_id?: string | null
          tax_minor?: number
          total_minor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issuing_entity_id_fkey"
            columns: ["issuing_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_receiving_entity_id_fkey"
            columns: ["receiving_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_settlement_currency_code_fkey"
            columns: ["settlement_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          eta_minutes: number | null
          id: string
          job_id: string
          offered_at: string | null
          rank: number
          rationale: Json
          responded_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          supplier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          eta_minutes?: number | null
          id?: string
          job_id: string
          offered_at?: string | null
          rank: number
          rationale?: Json
          responded_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          eta_minutes?: number | null
          id?: string
          job_id?: string
          offered_at?: string | null
          rank?: number
          rationale?: Json
          responded_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_evidence: {
        Row: {
          captured_at: string | null
          created_at: string
          geog: unknown
          id: string
          job_id: string
          kind: string
          metadata: Json
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          geog?: unknown
          id?: string
          job_id: string
          kind: string
          metadata?: Json
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          geog?: unknown
          id?: string
          job_id?: string
          kind?: string
          metadata?: Json
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["job_status"] | null
          id: string
          job_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          geog: unknown
          id: string
          job_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          geog?: unknown
          id?: string
          job_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          geog?: unknown
          id?: string
          job_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          asset_id: string | null
          breakdown_event_id: string | null
          completed_at: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          id: string
          priority: Database["public"]["Enums"]["job_priority"]
          quoted_amount_minor: number | null
          reference: string
          required_fault_type_id: string | null
          required_system_id: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          breakdown_event_id?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["job_priority"]
          quoted_amount_minor?: number | null
          reference?: string
          required_fault_type_id?: string | null
          required_system_id?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          breakdown_event_id?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["job_priority"]
          quoted_amount_minor?: number | null
          reference?: string
          required_fault_type_id?: string | null
          required_system_id?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "customer_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_breakdown_event_id_fkey"
            columns: ["breakdown_event_id"]
            isOneToOne: false
            referencedRelation: "breakdown_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "jobs_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_required_fault_type_id_fkey"
            columns: ["required_fault_type_id"]
            isOneToOne: false
            referencedRelation: "fault_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_required_system_id_fkey"
            columns: ["required_system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          address: string | null
          country_code: string
          created_at: string
          currency_code: string
          id: string
          is_receiving_entity: boolean
          name: string
          registration_number: string | null
          tax_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          country_code: string
          created_at?: string
          currency_code: string
          id?: string
          is_receiving_entity?: boolean
          name: string
          registration_number?: string | null
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_receiving_entity?: boolean
          name?: string
          registration_number?: string | null
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "legal_entities_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      location_corridors: {
        Row: {
          code: string
          countries: string[]
          created_at: string
          description: string | null
          id: string
          name: string
          path: unknown
          updated_at: string
        }
        Insert: {
          code: string
          countries?: string[]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          path?: unknown
          updated_at?: string
        }
        Update: {
          code?: string
          countries?: string[]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          path?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          geog: unknown
          id: string
          kind: string
          name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          geog: unknown
          id?: string
          kind?: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          geog?: unknown
          id?: string
          kind?: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      makes: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      model_systems: {
        Row: {
          created_at: string
          id: string
          model_id: string
          notes: string | null
          system_id: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          notes?: string | null
          system_id: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          notes?: string | null
          system_id?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_systems_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          asset_class_id: string
          created_at: string
          id: string
          make_id: string
          name: string
          updated_at: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          asset_class_id: string
          created_at?: string
          id?: string
          make_id: string
          name: string
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          asset_class_id?: string
          created_at?: string
          id?: string
          make_id?: string
          name?: string
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "models_asset_class_id_fkey"
            columns: ["asset_class_id"]
            isOneToOne: false
            referencedRelation: "asset_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "makes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          code: string
          created_at: string
          id: string
          locale: string
          subject: string | null
          updated_at: string
          updated_by: string | null
          variables: string[]
          whatsapp_category:
            | Database["public"]["Enums"]["whatsapp_category"]
            | null
        }
        Insert: {
          active?: boolean
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          code: string
          created_at?: string
          id?: string
          locale?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
          whatsapp_category?:
            | Database["public"]["Enums"]["whatsapp_category"]
            | null
        }
        Update: {
          active?: boolean
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          code?: string
          created_at?: string
          id?: string
          locale?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
          whatsapp_category?:
            | Database["public"]["Enums"]["whatsapp_category"]
            | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          payload: Json
          provider_message_id: string | null
          read_at: string | null
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_user_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_user_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          make_id: string | null
          manufacturer: string
          name: string
          part_number: string
          system_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          make_id?: string | null
          manufacturer: string
          name: string
          part_number: string
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          make_id?: string | null
          manufacturer?: string
          name?: string
          part_number?: string
          system_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_cross_reference: {
        Row: {
          created_at: string
          created_by: string | null
          equivalence_type: Database["public"]["Enums"]["equivalence_type"]
          equivalent_part_id: string
          id: string
          notes: string | null
          part_id: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equivalence_type: Database["public"]["Enums"]["equivalence_type"]
          equivalent_part_id: string
          id?: string
          notes?: string | null
          part_id: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equivalence_type?: Database["public"]["Enums"]["equivalence_type"]
          equivalent_part_id?: string
          id?: string
          notes?: string | null
          part_id?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_cross_reference_equivalent_part_id_fkey"
            columns: ["equivalent_part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_cross_reference_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_requests: {
        Row: {
          created_at: string
          description: string | null
          fulfilled_by_supplier_id: string | null
          id: string
          job_id: string | null
          part_id: string | null
          quantity: number
          requested_by: string | null
          status: Database["public"]["Enums"]["parts_request_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fulfilled_by_supplier_id?: string | null
          id?: string
          job_id?: string | null
          part_id?: string | null
          quantity?: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["parts_request_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fulfilled_by_supplier_id?: string | null
          id?: string
          job_id?: string | null
          part_id?: string | null
          quantity?: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["parts_request_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_requests_fulfilled_by_supplier_id_fkey"
            columns: ["fulfilled_by_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_requests_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          created_by: string | null
          currency_code: string
          exchange_rate: number | null
          exchange_rate_as_at: string | null
          id: string
          invoice_id: string
          method: string
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          created_by?: string | null
          currency_code: string
          exchange_rate?: number | null
          exchange_rate_as_at?: string | null
          id?: string
          invoice_id: string
          method: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number | null
          exchange_rate_as_at?: string | null
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_locale: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          dimensions: Json
          id: string
          job_id: string | null
          rater_id: string
          rater_role: Database["public"]["Enums"]["app_role"]
          score: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["rating_subject"]
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dimensions?: Json
          id?: string
          job_id?: string | null
          rater_id: string
          rater_role: Database["public"]["Enums"]["app_role"]
          score: number
          subject_id: string
          subject_type: Database["public"]["Enums"]["rating_subject"]
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          dimensions?: Json
          id?: string
          job_id?: string | null
          rater_id?: string
          rater_role?: Database["public"]["Enums"]["app_role"]
          score?: number
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["rating_subject"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_capabilities: {
        Row: {
          active: boolean
          asset_class_id: string
          confidence: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          fault_type_id: string | null
          id: string
          make_id: string | null
          model_id: string | null
          source: Database["public"]["Enums"]["capability_source"]
          supplier_id: string
          system_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          asset_class_id: string
          confidence?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          fault_type_id?: string | null
          id?: string
          make_id?: string | null
          model_id?: string | null
          source?: Database["public"]["Enums"]["capability_source"]
          supplier_id: string
          system_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          asset_class_id?: string
          confidence?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          fault_type_id?: string | null
          id?: string
          make_id?: string | null
          model_id?: string | null
          source?: Database["public"]["Enums"]["capability_source"]
          supplier_id?: string
          system_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_capabilities_asset_class_id_fkey"
            columns: ["asset_class_id"]
            isOneToOne: false
            referencedRelation: "asset_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_capabilities_fault_type_id_fkey"
            columns: ["fault_type_id"]
            isOneToOne: false
            referencedRelation: "fault_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_capabilities_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_capabilities_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_capabilities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_capabilities_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_coverage: {
        Row: {
          area: unknown
          corridor_id: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          radius_km: number | null
          response_time_minutes: number | null
          supplier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: unknown
          corridor_id?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          radius_km?: number | null
          response_time_minutes?: number | null
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: unknown
          corridor_id?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          radius_km?: number | null
          response_time_minutes?: number | null
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_coverage_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "location_corridors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_coverage_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "supplier_coverage_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_coverage_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          ai_extracted: Json | null
          ai_extracted_fields: Json | null
          created_at: string
          created_by: string | null
          doc_type: string
          expires_at: string | null
          extracted_fields: Json | null
          extraction_confidence: number | null
          extraction_confirmed_at: string | null
          extraction_confirmed_by: string | null
          extraction_model: string | null
          extraction_status: string
          field_confidence: Json
          id: string
          issued_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          supplier_id: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_extracted?: Json | null
          ai_extracted_fields?: Json | null
          created_at?: string
          created_by?: string | null
          doc_type: string
          expires_at?: string | null
          extracted_fields?: Json | null
          extraction_confidence?: number | null
          extraction_confirmed_at?: string | null
          extraction_confirmed_by?: string | null
          extraction_model?: string | null
          extraction_status?: string
          field_confidence?: Json
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_extracted?: Json | null
          ai_extracted_fields?: Json | null
          created_at?: string
          created_by?: string | null
          doc_type?: string
          expires_at?: string | null
          extracted_fields?: Json | null
          extraction_confidence?: number | null
          extraction_confirmed_at?: string | null
          extraction_confirmed_by?: string | null
          extraction_model?: string | null
          extraction_status?: string
          field_confidence?: Json
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_equipment: {
        Row: {
          capacity: string | null
          created_at: string
          created_by: string | null
          details: Json
          equipment_type: string
          id: string
          name: string | null
          quantity: number
          supplier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          equipment_type: string
          id?: string
          name?: string | null
          quantity?: number
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          capacity?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json
          equipment_type?: string
          id?: string
          name?: string | null
          quantity?: number
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_equipment_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_members: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          member_role: string
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_role?: string
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_role?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_members_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_parts: {
        Row: {
          created_at: string
          currency_code: string | null
          id: string
          lead_time_days: number | null
          part_id: string
          price_minor: number | null
          stock_qty: number
          supplier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          id?: string
          lead_time_days?: number | null
          part_id: string
          price_minor?: number | null
          stock_qty?: number
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          id?: string
          lead_time_days?: number | null
          part_id?: string
          price_minor?: number | null
          stock_qty?: number
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_parts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "supplier_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["supplier_status"] | null
          id: string
          reason: string | null
          supplier_id: string
          to_status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["supplier_status"] | null
          id?: string
          reason?: string | null
          supplier_id: string
          to_status: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["supplier_status"] | null
          id?: string
          reason?: string | null
          supplier_id?: string
          to_status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_status_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_location_id: string | null
          capability_description: string | null
          contact_full_name: string | null
          contact_id_number: string | null
          country_code: string
          coverage_regions: string[]
          created_at: string
          created_by: string | null
          email: string | null
          handled_fault_type_ids: string[]
          id: string
          is_available: boolean
          kind: Database["public"]["Enums"]["supplier_kind"]
          legal_name: string
          notes: string | null
          onboarding_step: number
          operates_24_7: boolean
          payment_preference: string | null
          phone: string | null
          preferred_locale: string
          primary_contact_user_id: string | null
          registration_number: string | null
          settlement_currency_code: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          submitted_at: string | null
          supplier_references: Json
          tax_number: string | null
          trading_name: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_location_id?: string | null
          capability_description?: string | null
          contact_full_name?: string | null
          contact_id_number?: string | null
          country_code: string
          coverage_regions?: string[]
          created_at?: string
          created_by?: string | null
          email?: string | null
          handled_fault_type_ids?: string[]
          id?: string
          is_available?: boolean
          kind: Database["public"]["Enums"]["supplier_kind"]
          legal_name: string
          notes?: string | null
          onboarding_step?: number
          operates_24_7?: boolean
          payment_preference?: string | null
          phone?: string | null
          preferred_locale?: string
          primary_contact_user_id?: string | null
          registration_number?: string | null
          settlement_currency_code?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          submitted_at?: string | null
          supplier_references?: Json
          tax_number?: string | null
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_location_id?: string | null
          capability_description?: string | null
          contact_full_name?: string | null
          contact_id_number?: string | null
          country_code?: string
          coverage_regions?: string[]
          created_at?: string
          created_by?: string | null
          email?: string | null
          handled_fault_type_ids?: string[]
          id?: string
          is_available?: boolean
          kind?: Database["public"]["Enums"]["supplier_kind"]
          legal_name?: string
          notes?: string | null
          onboarding_step?: number
          operates_24_7?: boolean
          payment_preference?: string | null
          phone?: string | null
          preferred_locale?: string
          primary_contact_user_id?: string | null
          registration_number?: string | null
          settlement_currency_code?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          submitted_at?: string | null
          supplier_references?: Json
          tax_number?: string | null
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_base_location_id_fkey"
            columns: ["base_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "suppliers_settlement_currency_code_fkey"
            columns: ["settlement_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      systems: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "systems_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_events: {
        Row: {
          asset_id: string | null
          created_at: string
          device_id: string
          event_type: string
          geog: unknown
          id: string
          payload: Json
          recorded_at: string
          speed_kph: number | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          device_id: string
          event_type: string
          geog?: unknown
          id?: string
          payload?: Json
          recorded_at: string
          speed_kph?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          device_id?: string
          event_type?: string
          geog?: unknown
          id?: string
          payload?: Json
          recorded_at?: string
          speed_kph?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telematics_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "customer_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          created_at: string
          id: string
          key: string
          locale: string
          namespace: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          locale: string
          namespace?: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          locale?: string
          namespace?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      trust_events: {
        Row: {
          created_at: string
          created_by: string | null
          details: Json
          event_type: string
          id: string
          source_entity_id: string | null
          source_entity_type: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["rating_subject"]
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          details?: Json
          event_type: string
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["rating_subject"]
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          details?: Json
          event_type?: string
          id?: string
          source_entity_id?: string | null
          source_entity_type?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["rating_subject"]
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_job: { Args: { _job_id: string }; Returns: boolean }
      has_role:
        | {
            Args: { _roles: Database["public"]["Enums"]["app_role"][] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_customer_member: { Args: { _customer_id: string }; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_supplier_member: { Args: { _supplier_id: string }; Returns: boolean }
      rank_suppliers: {
        Args: {
          _exclude?: string[]
          _fault_type_id: string
          _lat: number
          _lng: number
          _radius_km?: number
          _system_id: string
        }
        Returns: {
          rationale: Json
          score: number
          supplier_id: string
        }[]
      }
      search_parts: {
        Args: { _lat: number; _lng: number; _q: string; _radius_km?: number }
        Returns: {
          currency_code: string
          distance_km: number
          equivalence: string
          manufacturer: string
          part_id: string
          part_name: string
          part_number: string
          price_minor: number
          stock_qty: number
          supplier_id: string
          supplier_name: string
          verification: string
          via_part: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "approver"
        | "ops"
        | "auditor"
        | "customer"
        | "supplier"
        | "driver"
      assignment_status:
        | "proposed"
        | "offered"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
        | "completed"
      capability_source: "self_declared" | "ai_extracted" | "human_confirmed"
      country_status: "active" | "planned" | "inactive"
      customer_subtype:
        | "fleet_corporate"
        | "owner_driver"
        | "sme"
        | "government_institution"
      document_status:
        | "uploaded"
        | "processing"
        | "verified"
        | "rejected"
        | "expired"
      driving_side: "left" | "right"
      equivalence_type:
        | "oem"
        | "exact"
        | "interchangeable"
        | "functional"
        | "superseded"
        | "partial"
      invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "void"
        | "overdue"
      job_priority: "low" | "normal" | "high" | "critical"
      job_status:
        | "draft"
        | "reported"
        | "triaging"
        | "matching"
        | "offered"
        | "assigned"
        | "en_route"
        | "on_site"
        | "in_progress"
        | "awaiting_parts"
        | "completed"
        | "verified"
        | "invoiced"
        | "closed"
        | "cancelled"
        | "failed"
      listing_status: "draft" | "active" | "reserved" | "sold" | "withdrawn"
      notification_channel: "whatsapp" | "sms" | "email" | "push" | "in_app"
      notification_status: "queued" | "sent" | "delivered" | "read" | "failed"
      parts_request_status:
        | "open"
        | "quoted"
        | "ordered"
        | "fulfilled"
        | "cancelled"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
        | "cancelled"
      rating_subject: "supplier" | "customer" | "driver"
      supplier_kind:
        | "mobile_mechanic"
        | "workshop"
        | "auto_electrician"
        | "trailer_technician"
        | "tyre_specialist"
        | "welder"
        | "recovery_operator"
        | "parts_supplier"
        | "telematics_installer"
        | "inspector"
        | "logistics"
        | "marketplace_participant"
      supplier_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "suspended"
        | "delisted"
        | "rejected"
      verification_status:
        | "unverified"
        | "ai_suggested"
        | "community_confirmed"
        | "verified"
        | "rejected"
      whatsapp_category: "utility" | "authentication" | "marketing" | "service"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "approver",
        "ops",
        "auditor",
        "customer",
        "supplier",
        "driver",
      ],
      assignment_status: [
        "proposed",
        "offered",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
        "completed",
      ],
      capability_source: ["self_declared", "ai_extracted", "human_confirmed"],
      country_status: ["active", "planned", "inactive"],
      customer_subtype: [
        "fleet_corporate",
        "owner_driver",
        "sme",
        "government_institution",
      ],
      document_status: [
        "uploaded",
        "processing",
        "verified",
        "rejected",
        "expired",
      ],
      driving_side: ["left", "right"],
      equivalence_type: [
        "oem",
        "exact",
        "interchangeable",
        "functional",
        "superseded",
        "partial",
      ],
      invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "void",
        "overdue",
      ],
      job_priority: ["low", "normal", "high", "critical"],
      job_status: [
        "draft",
        "reported",
        "triaging",
        "matching",
        "offered",
        "assigned",
        "en_route",
        "on_site",
        "in_progress",
        "awaiting_parts",
        "completed",
        "verified",
        "invoiced",
        "closed",
        "cancelled",
        "failed",
      ],
      listing_status: ["draft", "active", "reserved", "sold", "withdrawn"],
      notification_channel: ["whatsapp", "sms", "email", "push", "in_app"],
      notification_status: ["queued", "sent", "delivered", "read", "failed"],
      parts_request_status: [
        "open",
        "quoted",
        "ordered",
        "fulfilled",
        "cancelled",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "cancelled",
      ],
      rating_subject: ["supplier", "customer", "driver"],
      supplier_kind: [
        "mobile_mechanic",
        "workshop",
        "auto_electrician",
        "trailer_technician",
        "tyre_specialist",
        "welder",
        "recovery_operator",
        "parts_supplier",
        "telematics_installer",
        "inspector",
        "logistics",
        "marketplace_participant",
      ],
      supplier_status: [
        "draft",
        "pending_review",
        "approved",
        "suspended",
        "delisted",
        "rejected",
      ],
      verification_status: [
        "unverified",
        "ai_suggested",
        "community_confirmed",
        "verified",
        "rejected",
      ],
      whatsapp_category: ["utility", "authentication", "marketing", "service"],
    },
  },
} as const
