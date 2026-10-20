// Generated from the Supabase schema (Phase 1.3). Do not edit by hand: regenerate after a
// schema change. Excluded from lint and Prettier on purpose.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      admins: {
        Row: { created_at: string; user_id: string };
        Insert: { created_at?: string; user_id: string };
        Update: { created_at?: string; user_id?: string };
        Relationships: [];
      };
      groups: {
        Row: { created_at: string; id: string; name: string; sort_order: number | null };
        Insert: { created_at?: string; id?: string; name: string; sort_order?: number | null };
        Update: { created_at?: string; id?: string; name?: string; sort_order?: number | null };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: { created_at: string; email: string; id: string };
        Insert: { created_at?: string; email: string; id?: string };
        Update: { created_at?: string; email?: string; id?: string };
        Relationships: [];
      };
      post_images: {
        Row: {
          alt: string | null;
          caption: string | null;
          created_at: string;
          id: string;
          post_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          alt?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          post_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          post_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_images_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          aspect: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          group_id: string | null;
          id: string;
          role: string | null;
          slug: string | null;
          sort_order: number | null;
          status: string;
          title: string;
          tools: string | null;
          updated_at: string;
          video_url: string | null;
          year: number | null;
        };
        Insert: {
          aspect?: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          group_id?: string | null;
          id?: string;
          role?: string | null;
          slug?: string | null;
          sort_order?: number | null;
          status?: string;
          title: string;
          tools?: string | null;
          updated_at?: string;
          video_url?: string | null;
          year?: number | null;
        };
        Update: {
          aspect?: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          group_id?: string | null;
          id?: string;
          role?: string | null;
          slug?: string | null;
          sort_order?: number | null;
          status?: string;
          title?: string;
          tools?: string | null;
          updated_at?: string;
          video_url?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      site_sections: {
        Row: {
          content: Json;
          created_at: string;
          enabled: boolean;
          id: string;
          name: string;
          reorderable: boolean;
          section_key: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name: string;
          reorderable?: boolean;
          section_key: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name?: string;
          reorderable?: boolean;
          section_key?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database['public']['Tables'];
export type Row<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type InsertRow<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type UpdateRow<T extends keyof PublicTables> = PublicTables[T]['Update'];
