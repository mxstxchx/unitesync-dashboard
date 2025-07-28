export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          spotify_id: string | null
          invitation_code: string | null
          status: string
          revenue: number
          signup_date: string | null
          attribution_source: string | null
          attribution_confidence: number | null
          attribution_method: string | null
          attribution_sequence: string | null
          attribution_days_diff: number | null
          attribution_invitation_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          spotify_id?: string | null
          invitation_code?: string | null
          status: string
          revenue?: number
          signup_date?: string | null
          attribution_source?: string | null
          attribution_confidence?: number | null
          attribution_method?: string | null
          attribution_sequence?: string | null
          attribution_days_diff?: number | null
          attribution_invitation_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          spotify_id?: string | null
          invitation_code?: string | null
          status?: string
          revenue?: number
          signup_date?: string | null
          attribution_source?: string | null
          attribution_confidence?: number | null
          attribution_method?: string | null
          attribution_sequence?: string | null
          attribution_days_diff?: number | null
          attribution_invitation_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          spotify_id: string | null
          spotify_url: string | null
          invitation_code: string | null
          report_link: string | null
          status: string | null
          created_at: string
          updated_at: string
          custom_vars: Record<string, unknown> | null
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          invitation_code?: string | null
          report_link?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          custom_vars?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          invitation_code?: string | null
          report_link?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          custom_vars?: Record<string, unknown> | null
        }
      }
      sequences: {
        Row: {
          id: string
          name: string
          status: string | null
          pipeline: string
          method: string | null
          contacted_count: number
          replied_count: number
          replied_percent: number
          replied_positive_count: number
          replied_positive_percent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          status?: string | null
          pipeline: string
          method?: string | null
          contacted_count?: number
          replied_count?: number
          replied_percent?: number
          replied_positive_count?: number
          replied_positive_percent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string | null
          pipeline?: string
          method?: string | null
          contacted_count?: number
          replied_count?: number
          replied_percent?: number
          replied_positive_count?: number
          replied_positive_percent?: number
          created_at?: string
          updated_at?: string
        }
      }
      threads: {
        Row: {
          id: string
          contact_id: string | null
          contact_email: string
          contact_first_name: string | null
          contact_last_name: string | null
          subject: string | null
          mailbox_id: string | null
          reply_type: string | null
          label_id: string | null
          is_unread: boolean
          latest_date: string | null
          latest_content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          contact_id?: string | null
          contact_email: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          subject?: string | null
          mailbox_id?: string | null
          reply_type?: string | null
          label_id?: string | null
          is_unread?: boolean
          latest_date?: string | null
          latest_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string | null
          contact_email?: string
          contact_first_name?: string | null
          contact_last_name?: string | null
          subject?: string | null
          mailbox_id?: string | null
          reply_type?: string | null
          label_id?: string | null
          is_unread?: boolean
          latest_date?: string | null
          latest_content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      emails: {
        Row: {
          id: string
          thread_id: string
          sequence_id: string | null
          subject: string | null
          content: string | null
          date: string
          type: string | null
          sequence_name: string | null
          step_order: number | null
          variant_id: string | null
          variant_pattern: string | null
          variant_confidence: number | null
          created_at: string
        }
        Insert: {
          id: string
          thread_id: string
          sequence_id?: string | null
          subject?: string | null
          content?: string | null
          date: string
          type?: string | null
          sequence_name?: string | null
          step_order?: number | null
          variant_id?: string | null
          variant_pattern?: string | null
          variant_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          sequence_id?: string | null
          subject?: string | null
          content?: string | null
          date?: string
          type?: string | null
          sequence_name?: string | null
          step_order?: number | null
          variant_id?: string | null
          variant_pattern?: string | null
          variant_confidence?: number | null
          created_at?: string
        }
      }
      audits: {
        Row: {
          id: string
          spotify_id: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          request_date: string | null
          source: string | null
          client_id: string | null
          converted: boolean
          conversion_date: string | null
          was_contacted_first: boolean
          contact_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          spotify_id?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          request_date?: string | null
          source?: string | null
          client_id?: string | null
          converted?: boolean
          conversion_date?: string | null
          was_contacted_first?: boolean
          contact_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          spotify_id?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          request_date?: string | null
          source?: string | null
          client_id?: string | null
          converted?: boolean
          conversion_date?: string | null
          was_contacted_first?: boolean
          contact_id?: string | null
          created_at?: string
        }
      }
      client_contact_attribution: {
        Row: {
          id: number
          client_id: string
          contact_id: string
          method: string
          confidence: number
          matched_value: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          contact_id: string
          method: string
          confidence: number
          matched_value?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          client_id?: string
          contact_id?: string
          method?: string
          confidence?: number
          matched_value?: string | null
          created_at?: string
        }
      }
      client_thread_attribution: {
        Row: {
          id: number
          client_id: string
          thread_id: string
          confidence: number
          method: string
          created_at: string
        }
        Insert: {
          client_id: string
          thread_id: string
          confidence: number
          method: string
          created_at?: string
        }
        Update: {
          id?: number
          client_id?: string
          thread_id?: string
          confidence?: number
          method?: string
          created_at?: string
        }
      }
      sequence_variants: {
        Row: {
          id: string
          sequence_id: string
          step_id: string
          variant_order: number | null
          label: string | null
          status: string | null
          distribution_weight: number | null
          subject_template: string | null
          subject_pattern: string | null
          content_template: string | null
          tonality: string | null
          has_spintax: boolean
          emails_sent: number
          replies_received: number
          positive_replies: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          sequence_id: string
          step_id: string
          variant_order?: number | null
          label?: string | null
          status?: string | null
          distribution_weight?: number | null
          subject_template?: string | null
          subject_pattern?: string | null
          content_template?: string | null
          tonality?: string | null
          has_spintax?: boolean
          emails_sent?: number
          replies_received?: number
          positive_replies?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string
          step_id?: string
          variant_order?: number | null
          label?: string | null
          status?: string | null
          distribution_weight?: number | null
          subject_template?: string | null
          subject_pattern?: string | null
          content_template?: string | null
          tonality?: string | null
          has_spintax?: boolean
          emails_sent?: number
          replies_received?: number
          positive_replies?: number
          created_at?: string
          updated_at?: string
        }
      }
      convrt_campaigns: {
        Row: {
          id: number
          campaign_id: string
          instagram_handle: string | null
          method: string | null
          status: string | null
          completion_date: string | null
          client_id: string | null
          converted: boolean
          revenue: number
          created_at: string
        }
        Insert: {
          campaign_id: string
          instagram_handle?: string | null
          method?: string | null
          status?: string | null
          completion_date?: string | null
          client_id?: string | null
          converted?: boolean
          revenue?: number
          created_at?: string
        }
        Update: {
          id?: number
          campaign_id?: string
          instagram_handle?: string | null
          method?: string | null
          status?: string | null
          completion_date?: string | null
          client_id?: string | null
          converted?: boolean
          revenue?: number
          created_at?: string
        }
      }
      data_processing_jobs: {
        Row: {
          id: number
          job_type: string
          status: string
          source_file: string | null
          records_processed: number
          records_success: number
          records_failed: number
          started_at: string | null
          completed_at: string | null
          results: Record<string, unknown> | null
          error_log: string | null
          created_at: string
        }
        Insert: {
          job_type: string
          status: string
          source_file?: string | null
          records_processed?: number
          records_success?: number
          records_failed?: number
          started_at?: string | null
          completed_at?: string | null
          results?: Record<string, unknown> | null
          error_log?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          job_type?: string
          status?: string
          source_file?: string | null
          records_processed?: number
          records_success?: number
          records_failed?: number
          started_at?: string | null
          completed_at?: string | null
          results?: Record<string, unknown> | null
          error_log?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}