/**
 * Типы базы данных.
 *
 * Обычно этот файл генерируется командой
 *   supabase gen types typescript --local > src/types/db.ts
 * Здесь он написан вручную и точно соответствует
 * supabase/migrations/0001_schema.sql и 0003_analytics.sql.
 *
 * При изменении схемы перегенерируйте файл, а не правьте руками.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "admin" | "master";

export type OrderStatus =
  | "new"
  | "assigned"
  | "on_the_way"
  | "in_progress"
  | "done"
  | "canceled";

export type LeadChannel = "whatsapp" | "phone";

export type LeadSource = "google_ads" | "2gis" | "organic" | "referral" | "direct";

export type PaymentMethod = "cash" | "transfer";

export type ApplianceKind =
  | "washer"
  | "dishwasher"
  | "dryer"
  | "fridge"
  | "oven"
  | "hood"
  | "industrial"
  | "other";

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

type LeadRow = {
  id: string;
  created_at: string;
  channel: LeadChannel;
  source: LeadSource;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  page_anchor: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  order_id: string | null;
};

type OrderRow = {
  id: string;
  number: number;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  client_phone: string;
  address: string | null;
  appliance: ApplianceKind;
  problem: string | null;
  status: OrderStatus;
  master_id: string | null;
  scheduled_at: string | null;
  total_amount: number | null;
  expenses: number;
  expenses_note: string | null;
  payment_method: PaymentMethod | null;
  company_share_percent: number;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  contract_number: string | null;
  contract_date: string | null;
  is_legal_entity: boolean;
  org_name: string | null;
  org_bin: string | null;
  org_address: string | null;
  source: LeadSource;
  lead_id: string | null;
  cancel_reason: string | null;
  created_by: string | null;
};

type OrderEventRow = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_id: string | null;
  actor_role: UserRole | null;
  note: string | null;
  created_at: string;
};

type AppSettingsRow = {
  id: boolean;
  master_password_version: number;
  default_company_share_percent: number;
  company_name: string;
  company_legal_name: string | null;
  company_bin: string | null;
  company_address: string | null;
  company_phone: string | null;
  bank_name: string | null;
  bank_bic: string | null;
  bank_account: string | null;
  diagnostics_price: number;
  warranty_months: number;
  repair_term_days: number;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  position: number;
  title: string;
  price: number;
  quantity: number;
  warranty_months: number;
  created_at: string;
};

type AuthAttemptRow = {
  id: number;
  ip_hash: string;
  created_at: string;
};

/** Поля с значением по умолчанию необязательны при вставке. */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Optional<ProfileRow, "id" | "role" | "is_active" | "created_at" | "phone">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      leads: {
        Row: LeadRow;
        Insert: Optional<LeadRow, Exclude<keyof LeadRow, "channel">>;
        Update: Partial<LeadRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Optional<OrderRow, Exclude<keyof OrderRow, "client_phone">>;
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      order_events: {
        Row: OrderEventRow;
        Insert: Optional<OrderEventRow, Exclude<keyof OrderEventRow, "order_id" | "to_status">>;
        Update: Partial<OrderEventRow>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: Optional<AppSettingsRow, keyof AppSettingsRow>;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: Optional<OrderItemRow, Exclude<keyof OrderItemRow, "order_id" | "title">>;
        Update: Partial<OrderItemRow>;
        Relationships: [];
      };
      auth_attempts: {
        Row: AuthAttemptRow;
        Insert: Optional<AuthAttemptRow, "id" | "created_at">;
        Update: Partial<AuthAttemptRow>;
        Relationships: [];
      };
    };
    Views: {
      client_stats: {
        Row: {
          client_phone: string | null;
          orders_count: number | null;
          revenue: number | null;
          last_order_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      analytics_summary: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      lead_channel: LeadChannel;
      lead_source: LeadSource;
      appliance_kind: ApplianceKind;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<never, never>;
  };
};
