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
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_infrastructure_identities: {
        Row: {
          user_id: string;
          freestyle_identity_id: string;
          created_at: string;
          last_validated_at: string;
        };
        Insert: {
          user_id: string;
          freestyle_identity_id: string;
          created_at?: string;
          last_validated_at?: string;
        };
        Update: {
          user_id?: string;
          freestyle_identity_id?: string;
          created_at?: string;
          last_validated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_infrastructure_identities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          owner_user_id: string;
          wrapper_repo_id: string;
          source_repo_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          wrapper_repo_id: string;
          source_repo_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          wrapper_repo_id?: string;
          source_repo_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
