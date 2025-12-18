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
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: string;
          created_at?: string;
        };
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
      };
    };
  };
}
