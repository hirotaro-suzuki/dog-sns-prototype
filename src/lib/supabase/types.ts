export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          store_code: string;
          store_name: string;
          display_name: string;
          login_code: string;
          pin_hash: string;
          logo_url: string | null;
          frame_url: string | null;
          theme_color: string | null;
          print_template_type: string;
          timezone: string;
          sns_display_name: string | null;
          instagram_account: string | null;
          default_hashtags: string | null;
          address: string | null;
          phone: string | null;
          business_hours_note: string | null;
          is_active: boolean;
          sort_order: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_code: string;
          store_name: string;
          display_name: string;
          login_code: string;
          pin_hash: string;
          logo_url?: string | null;
          frame_url?: string | null;
          theme_color?: string | null;
          print_template_type?: string;
          timezone?: string;
          sns_display_name?: string | null;
          instagram_account?: string | null;
          default_hashtags?: string | null;
          address?: string | null;
          phone?: string | null;
          business_hours_note?: string | null;
          is_active?: boolean;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      staff_members: {
        Row: {
          id: string;
          store_id: string;
          staff_code: string;
          display_name: string;
          role_label: string | null;
          can_approve_sns: boolean;
          is_active: boolean;
          sort_order: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          staff_code: string;
          display_name: string;
          role_label?: string | null;
          can_approve_sns?: boolean;
          is_active?: boolean;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_members"]["Insert"]>;
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string;
          display_name: string;
          role: "owner" | "admin" | "viewer";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          display_name: string;
          role?: "owner" | "admin" | "viewer";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
      };
      assets: {
        Row: {
          id: string;
          manage_code: string;
          store_id: string;
          store_code: string;
          store_display_name: string;
          staff_id: string | null;
          staff_display_name: string | null;
          captured_date: string;
          sequence_number: number;
          dog_name: string;
          dog_breed: string | null;
          dog_age: string | null;
          staff_comment: string | null;
          sns_consent: boolean;
          mosaic_required: boolean;
          final_processed_url: string;
          frame_url_snapshot: string | null;
          logo_url_snapshot: string | null;
          theme_color_snapshot: string | null;
          print_template_type_snapshot: string | null;
          printed_at: string | null;
          consent_confirmed_at: string | null;
          status: "ready" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manage_code: string;
          store_id: string;
          store_code: string;
          store_display_name: string;
          staff_id?: string | null;
          staff_display_name?: string | null;
          captured_date: string;
          sequence_number: number;
          dog_name: string;
          dog_breed?: string | null;
          dog_age?: string | null;
          staff_comment?: string | null;
          sns_consent?: boolean;
          mosaic_required?: boolean;
          final_processed_url: string;
          frame_url_snapshot?: string | null;
          logo_url_snapshot?: string | null;
          theme_color_snapshot?: string | null;
          print_template_type_snapshot?: string | null;
          printed_at?: string | null;
          consent_confirmed_at?: string | null;
          status?: "ready" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      store_frames: {
        Row: {
          id: string;
          store_id: string;
          frame_name: string;
          frame_url: string;
          is_default: boolean;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          frame_name: string;
          frame_url: string;
          is_default?: boolean;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_frames"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
