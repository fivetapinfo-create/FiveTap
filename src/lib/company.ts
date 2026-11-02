import "server-only";
import { db } from "./supabase";
import type { ContractInput, Founder as ContractFounder, Provider } from "./contract";

export type Cost = { name: string; amount: number };

export type Company = {
  trade_name: string;
  legal_name: string | null;
  entity_type: string | null;
  registry_number: string | null;
  constitution_date: string | null;
  legal_address: string | null;
  representative_name: string | null;
  representative_id: string | null;
  representative_role: string;
  option_pool_pct: number;
  monthly_costs: Cost[];
  paypal_fee_pct: number;
  paypal_fee_fixed: number;
  cost_plaque: number;
  cost_card: number;
};

export type Founder = ContractFounder & {
  id: string;
  nationality: string | null;
  equity_pct: number;
  joined_on: string;
};

export type DocumentRow = { id: string; kind: string; title: string; path: string; created_at: string };

export type ContractRow = ContractInput & { id: string; business_id: string | null; logo_path: string | null };

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getCompany(): Promise<Company> {
  const row = must(await db().from("company").select("*").eq("id", 1).maybeSingle()) as Company | null;
  if (row) return { ...row, monthly_costs: Array.isArray(row.monthly_costs) ? row.monthly_costs : [] };
  must(await db().from("company").insert({ id: 1 }).select("*").single());
  return getCompany();
}

export async function listFounders() {
  return must(await db().from("founders").select("*").order("created_at")) as Founder[];
}

export async function listDocuments() {
  return must(await db().from("documents").select("*").order("created_at", { ascending: false })) as DocumentRow[];
}

export async function listContracts() {
  return must(await db().from("contracts").select("*").order("created_at", { ascending: false })) as ContractRow[];
}

export async function getContract(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return must(await db().from("contracts").select("*").eq("id", id).maybeSingle()) as ContractRow | null;
}

/** Who signs for FiveTap: the company's trade/legal name and its first founder. */
export async function provider(): Promise<Provider> {
  const [c, founders] = await Promise.all([getCompany(), listFounders()]);
  return {
    trade_name: c.trade_name,
    legal_name: c.legal_name,
    legal_address: c.legal_address,
    founder: founders[0] ?? null,
    representative: c.representative_name
      ? { name: c.representative_name, id: c.representative_id, role: c.representative_role || "Representante legal" }
      : null,
  };
}

// ---------- Private files (company papers, contract logos) ----------

const BUCKET = "private";

export async function uploadPrivate(path: string, file: Blob, contentType: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, file, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function downloadPrivate(path: string) {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

export async function removePrivate(path: string) {
  await db().storage.from(BUCKET).remove([path]);
}

// ---------- Money: real figures from recorded payments ----------

type PaymentRow = { amount: number; kind: string; method: string; paid_at: string };
type BizRow = { status: string; mode: string; monthly_fee: number };

const PANAMA_OFFSET_MS = 5 * 3600_000; // UTC-5 all year.

/** Revenue to date and this month, MRR and an estimated monthly net from live data. */
export async function finances(c: Company) {
  const [payments, businesses] = await Promise.all([
    db().from("payments").select("amount, kind, method, paid_at").order("paid_at"),
    db().from("businesses").select("status, mode, monthly_fee"),
  ]);
  const pays = (must(payments) as PaymentRow[]).map((p) => ({ ...p, amount: Number(p.amount) }));
  const biz = (must(businesses) as BizRow[]).map((b) => ({ ...b, monthly_fee: Number(b.monthly_fee) }));

  const now = new Date(Date.now() - PANAMA_OFFSET_MS);
  const monthKey = now.toISOString().slice(0, 7);
  const local = (iso: string) => new Date(new Date(iso).getTime() - PANAMA_OFFSET_MS).toISOString().slice(0, 7);
  const sum = (rows: PaymentRow[]) => rows.reduce((n, p) => n + p.amount, 0);

  const byKind = (k: string) => pays.filter((p) => p.kind === k);
  const thisMonth = pays.filter((p) => local(p.paid_at) === monthKey);
  const paypalShare = (rows: PaymentRow[]) =>
    rows.filter((p) => p.method === "paypal" || p.method === "card")
      .reduce((n, p) => n + (p.amount * Number(c.paypal_fee_pct)) / 100 + Number(c.paypal_fee_fixed), 0);

  const active = biz.filter((b) => b.status === "active");
  const subscribers = active.filter((b) => b.mode === "full" && b.monthly_fee > 0);
  const mrr = subscribers.reduce((n, b) => n + b.monthly_fee, 0);
  const fixed = c.monthly_costs.reduce((n, x) => n + Number(x.amount || 0), 0);
  // PayPal fee estimated on MRR as if every subscription were charged by PayPal.
  const mrrFees = subscribers.reduce((n, b) => n + (b.monthly_fee * Number(c.paypal_fee_pct)) / 100 + Number(c.paypal_fee_fixed), 0);

  // Last six months of cash in, for the trend.
  const months: { key: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ key, total: sum(pays.filter((p) => local(p.paid_at) === key)) });
  }

  return {
    totalToDate: sum(pays),
    feesToDate: paypalShare(pays),
    thisMonth: sum(thisMonth),
    thisMonthFees: paypalShare(thisMonth),
    byKind: {
      setup: sum(byKind("setup")),
      monthly: sum(byKind("monthly")),
      annual: sum(byKind("annual")),
      pieces: sum(byKind("pieces")),
      other: sum(byKind("other")),
    },
    counts: {
      businesses: biz.length,
      active: active.length,
      subscribers: subscribers.length,
      oneTime: biz.filter((b) => b.mode === "google").length,
      trial: biz.filter((b) => b.status === "trial").length,
    },
    mrr,
    mrrFees,
    fixed,
    netMonthly: mrr - mrrFees - fixed,
    months,
  };
}
