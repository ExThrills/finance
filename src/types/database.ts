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
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type:
            | "checking"
            | "savings"
            | "credit"
            | "cash"
            | "investment"
            | "other";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type:
            | "checking"
            | "savings"
            | "credit"
            | "cash"
            | "investment"
            | "other";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?:
            | "checking"
            | "savings"
            | "credit"
            | "cash"
            | "investment"
            | "other";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: "expense" | "income";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind: "expense" | "income";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          kind?: "expense" | "income";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          amount: number;
          date: string;
          description: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          amount: number;
          date: string;
          description: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          category_id?: string | null;
          amount?: number;
          date?: string;
          description?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      field_definitions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          field_type: "text" | "number" | "date" | "boolean" | "select";
          select_options: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          field_type: "text" | "number" | "date" | "boolean" | "select";
          select_options?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          field_type?: "text" | "number" | "date" | "boolean" | "select";
          select_options?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_definitions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_field_values: {
        Row: {
          id: string;
          transaction_id: string;
          field_definition_id: string;
          value_text: string | null;
          value_number: number | null;
          value_date: string | null;
          value_bool: boolean | null;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          field_definition_id: string;
          value_text?: string | null;
          value_number?: number | null;
          value_date?: string | null;
          value_bool?: boolean | null;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          field_definition_id?: string;
          value_text?: string | null;
          value_number?: number | null;
          value_date?: string | null;
          value_bool?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_field_values_field_definition_id_fkey";
            columns: ["field_definition_id"];
            referencedRelation: "field_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_field_values_transaction_id_fkey";
            columns: ["transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
