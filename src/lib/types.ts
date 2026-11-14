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
  /** Where payment receipts are emailed (falls back to the manager's email). */
  billing_email: string | null;
  cancel_requested_at: string | null;
  cancel_reason: string | null;
  /** Extra days given by the founder: plaques keep working until this date even if late. */
  grace_until: string | null;
  status: BusinessStatus;
  setup_fee: number;
  monthly_fee: number;
  trial_ends_at: string | null;
  notes: string | null;
  owner_token: string;
  /** Commercial plan (Start, Pro, Enterprise); null for a custom price. */
  plan_key: string | null;
  mode: "full" | "google";
  /** Google Place ID ("ChIJ…"), used to read the review count from Google. */
  google_place_id: string | null;
  /** FiveTap Business access codes (owner and manager), encrypted. */
  owner_code_enc: string | null;
  manager_code_enc: string | null;
  /** Wrong codes in a row, and until when the app is locked after too many. */
  access_fails: number;
  access_locked_until: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  business_id: string;
  label: string;
  /** A plaque on a table (or the counter) or a card a waiter carries. */
  kind: "table" | "waiter";
  code: string;
  active: boolean;
  /** Inventory state: created → written (on the chip) → delivered (at the venue) → retired. */
  status: "created" | "written" | "delivered" | "retired";
  written_at: string | null;
  delivered_at: string | null;
  retired_at: string | null;
  /** The founder's own note; never written on the chip. */
  note: string | null;
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
  resolved_at: string | null;
  /** Private stars the guest gave (1 = very bad … 5 = excellent); older messages have none. */
  rating: number | null;
  created_at: string;
};

export type Payment = {
  id: string;
  business_id: string;
  amount: number;
  kind: "setup" | "monthly" | "annual" | "pieces" | "other";
  method: "paypal" | "card" | "ach" | "yappy" | "cash" | "other";
  /** Name of a method the founder added (when method is "other"). */
  method_label: string | null;
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
