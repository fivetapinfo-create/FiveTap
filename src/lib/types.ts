export type BusinessStatus = "trial" | "active" | "paused" | "canceled";

export type Business = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  logo_url: string | null;
  brand_color: string;
  google_review_url: string;
  manager_email: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  billing_name: string | null;
  billing_phone: string | null;
  cancel_requested_at: string | null;
  cancel_reason: string | null;
  status: BusinessStatus;
  setup_fee: number;
  monthly_fee: number;
  trial_ends_at: string | null;
  notes: string | null;
  owner_token: string;
  mode: "full" | "google";
  created_at: string;
};

export type Tag = {
  id: string;
  business_id: string;
  label: string;
  code: string;
  active: boolean;
  created_at: string;
};

export type Feedback = {
  id: string;
  business_id: string;
  tag_id: string | null;
  name: string | null;
  message: string;
  phone: string | null;
  notified_via: string[];
  read_at: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  business_id: string;
  amount: number;
  kind: "setup" | "monthly" | "annual" | "pieces" | "other";
  method: "paypal" | "card" | "ach" | "yappy" | "cash";
  reference: string | null;
  paid_at: string;
};

export type BusinessStats = {
  business_id: string;
  scans_7d: number;
  scans_30d: number;
  reviews_30d: number;
  feedback_30d: number;
  last_event_at: string | null;
};

export type TagStats = { tag_id: string; scans_30d: number; reviews_30d: number };

export type Contact = {
  id: string;
  business_id: string;
  tag_id: string | null;
  name: string;
  phone: string;
  birthday_month: number | null;
  birthday_day: number | null;
  consent_at: string;
  created_at: string;
};
