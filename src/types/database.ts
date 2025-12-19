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
          institution: string | null;
          last4: string | null;
          credit_limit: number | null;
          apr: number | null;
          statement_close_day: number | null;
          statement_due_day: number | null;
          current_balance: number;
          available_balance: number | null;
          available_credit: number | null;
          reward_currency: string | null;
          last_sync_at: string | null;
          sync_status: "manual" | "ok" | "error" | "disconnected" | "pending";
          sync_error: string | null;
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
          institution?: string | null;
          last4?: string | null;
          credit_limit?: number | null;
          apr?: number | null;
          statement_close_day?: number | null;
          statement_due_day?: number | null;
          current_balance?: number;
          available_balance?: number | null;
          available_credit?: number | null;
          reward_currency?: string | null;
          last_sync_at?: string | null;
          sync_status?: "manual" | "ok" | "error" | "disconnected" | "pending";
          sync_error?: string | null;
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
          institution?: string | null;
          last4?: string | null;
          credit_limit?: number | null;
          apr?: number | null;
          statement_close_day?: number | null;
          statement_due_day?: number | null;
          current_balance?: number;
          available_balance?: number | null;
          available_credit?: number | null;
          reward_currency?: string | null;
          last_sync_at?: string | null;
          sync_status?: "manual" | "ok" | "error" | "disconnected" | "pending";
          sync_error?: string | null;
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
      transfers: {
        Row: {
          id: string;
          user_id: string;
          source_account_id: string;
          destination_account_id: string;
          amount: number;
          memo: string | null;
          occurred_at: string;
          created_at: string;
          transfer_group_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_account_id: string;
          destination_account_id: string;
          amount: number;
          memo?: string | null;
          occurred_at?: string;
          created_at?: string;
          transfer_group_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_account_id?: string;
          destination_account_id?: string;
          amount?: number;
          memo?: string | null;
          occurred_at?: string;
          created_at?: string;
          transfer_group_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transfers_destination_account_id_fkey";
            columns: ["destination_account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transfers_source_account_id_fkey";
            columns: ["source_account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transfers_user_id_fkey";
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
          is_pending: boolean;
          cleared_at: string | null;
          transfer_id: string | null;
          recurring_group_key: string | null;
          recurring_confidence: number | null;
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
          is_pending?: boolean;
          cleared_at?: string | null;
          transfer_id?: string | null;
          recurring_group_key?: string | null;
          recurring_confidence?: number | null;
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
          is_pending?: boolean;
          cleared_at?: string | null;
          transfer_id?: string | null;
          recurring_group_key?: string | null;
          recurring_confidence?: number | null;
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
          },
          {
            foreignKeyName: "transactions_transfer_id_fkey";
            columns: ["transfer_id"];
            referencedRelation: "transfers";
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
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_tags: {
        Row: {
          id: string;
          transaction_id: string;
          tag_id: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          tag_id: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey";
            columns: ["tag_id"];
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey";
            columns: ["transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_splits: {
        Row: {
          id: string;
          transaction_id: string;
          account_id: string | null;
          category_id: string | null;
          amount: number;
          description: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          account_id?: string | null;
          category_id?: string | null;
          amount: number;
          description?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          amount?: number;
          description?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_splits_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_splits_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey";
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
