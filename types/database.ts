export type VoteValue = "yes" | "maybe" | "no";
export type ActivitySourceType = "manual" | "reddit" | "google" | "ai" | "tiktok";
export type ProgramType = "general" | "user_based";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          area: string | null;
          booking_link: string | null;
          booking_required: boolean;
          created_at: string;
          created_by_user_id: string | null;
          description: string | null;
          duration: number | null;
          google_maps_link: string | null;
          id: string;
          last_updated: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          notes: string | null;
          popularity: number;
          price: string | null;
          reddit_link: string | null;
          source_name: string | null;
          source_type: ActivitySourceType | null;
          tiktok_link: string | null;
          type: string | null;
          voting_phase: boolean;
        };
        Insert: {
          area?: string | null;
          booking_link?: string | null;
          booking_required?: boolean;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          duration?: number | null;
          google_maps_link?: string | null;
          id?: string;
          last_updated?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          notes?: string | null;
          popularity?: number;
          price?: string | null;
          reddit_link?: string | null;
          source_name?: string | null;
          source_type?: ActivitySourceType | null;
          tiktok_link?: string | null;
          type?: string | null;
          voting_phase?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };
      activity_selections: {
        Row: {
          activity_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_selections"]["Insert"]>;
      };
      programs: {
        Row: {
          content: Json | null;
          created_at: string;
          created_by_user_id: string | null;
          day: number | null;
          id: string;
          program_json: Json;
          program_type: ProgramType;
        };
        Insert: {
          content?: Json | null;
          created_at?: string;
          created_by_user_id?: string | null;
          day?: number | null;
          id?: string;
          program_json: Json;
          program_type?: ProgramType;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
      };
      users: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      votes: {
        Row: {
          activity_id: string;
          created_at: string;
          id: string;
          user_id: string;
          vote: VoteValue;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
          vote: VoteValue;
        };
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
      };
    };
  };
}
