export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";
export type ProcessingStatus =
  | "WAITING_PAYMENT"
  | "QUEUED"
  | "DOWNLOADING"
  | "PROCESSING"
  | "UPLOADING"
  | "COMPLETED"
  | "FAILED";

type Table<Row extends Record<string, unknown>, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "USER" | "ADMIN";
  created_at: string;
  updated_at: string;
};

type PackageRow = {
  id: string;
  name: string;
  clip_count: number;
  price: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  order_code: string;
  user_id: string;
  youtube_url: string | null;
  package_id: string;
  package_name: string;
  clip_count: number;
  amount: number;
  currency: string;
  payment_status: PaymentStatus;
  processing_status: ProcessingStatus;
  dana_reference_no: string | null;
  dana_partner_reference_no: string | null;
  dana_qr_content: string | null;
  dana_qr_url: string | null;
  dana_qr_image: string | null;
  dana_checkout_url: string | null;
  payment_created_at: string;
  paid_at: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  result_url: string | null;
  result_zip_path: string | null;
  result_expires_at: string | null;
  results_deleted_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  metadata: Json;
};

type PaymentRow = {
  id: string;
  order_id: string;
  provider: string;
  provider_reference: string;
  partner_reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  qr_content: string | null;
  qr_url: string | null;
  qr_image: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProcessingJobRow = {
  id: string;
  order_id: string;
  status: ProcessingStatus;
  progress: number;
  attempt_count: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

type ClipRow = {
  id: string;
  order_id: string;
  clip_number: number;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  upload_status: "UPLOADING" | "READY" | "FAILED";
  created_at: string;
};

type WebhookEventRow = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  order_id: string | null;
  payload: Json;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
};

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
};

type PaymentProofRow = {
  id: string;
  payment_id: string;
  order_id: string;
  storage_path: string;
  ocr_amount: number;
  ocr_transaction_date: string;
  review_status: "SUBMITTED" | "APPROVED" | "REJECTED";
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};

type RateLimitRow = {
  user_id: string;
  action: string;
  window_start: string;
  request_count: number;
};

type SiteConfigurationRow = {
  id: string;
  landing_content: Json;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  updated_at: string;
};

type SiteArticleRow = {
  slug: string;
  title: string;
  seo_title: string;
  description: string;
  keyphrase: string;
  intro: string;
  related_slugs: string[];
  sections: Json;
  published: boolean;
  updated_at: string;
};

type AdminStats = {
  total_users: number;
  total_orders: number;
  paid_orders: number;
  processing_orders: number;
  completed_orders: number;
  failed_orders: number;
  revenue_idr: number;
  total_clips: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "email" | "full_name">;
      packages: Table<PackageRow, "id" | "name" | "clip_count" | "price">;
      orders: Table<OrderRow, "order_code" | "user_id" | "package_id" | "package_name" | "clip_count" | "amount">;
      payments: Table<PaymentRow, "order_id" | "provider_reference" | "partner_reference" | "amount">;
      processing_jobs: Table<ProcessingJobRow, "order_id">;
      clips: Table<ClipRow, "order_id" | "clip_number" | "storage_path" | "file_name" | "size_bytes">;
      payment_proofs: Table<PaymentProofRow, "payment_id" | "order_id" | "storage_path" | "ocr_amount" | "ocr_transaction_date">;
      webhook_events: Table<WebhookEventRow, "provider" | "provider_event_id" | "event_type">;
      audit_logs: Table<AuditLogRow, "action" | "entity_type">;
      api_rate_limits: Table<RateLimitRow, "user_id" | "action" | "window_start">;
      site_configuration: Table<SiteConfigurationRow, "id">;
      site_articles: Table<SiteArticleRow, "slug" | "title" | "seo_title" | "description" | "keyphrase" | "intro">;
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_dashboard_stats: { Args: Record<string, never>; Returns: AdminStats[] };
      confirm_paid_order: {
        Args: { p_order_id: string; p_provider_reference: string; p_amount: number };
        Returns: { confirmed_order_id: string; execution_job_id: string | null; already_paid: boolean }[];
      };
      auto_approve_manual_qris_proof: {
        Args: { p_proof_id: string };
        Returns: { confirmed_order_id: string; already_paid: boolean }[];
      };
      consume_user_rate_limit: {
        Args: { p_user_id: string; p_action: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      update_browser_processing_status: {
        Args: { p_order_id: string; p_status: string; p_progress: number; p_error_message: string | null };
        Returns: undefined;
      };
      review_manual_qris_payment: {
        Args: { p_proof_id: string; p_decision: string; p_admin_user_id: string; p_note: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "USER" | "ADMIN";
      payment_status: PaymentStatus;
      processing_status: ProcessingStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
