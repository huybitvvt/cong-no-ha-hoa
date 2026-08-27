#!/usr/bin/env node

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let email = process.env.SMOKE_EMAIL;
let password = process.env.SMOKE_PASSWORD;
if (!url || !anonKey) throw new Error("Thiếu URL hoặc anon key");

const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const ids = { customer: null, debt: null, payment: null, returned: null };
let temporaryUserId = null;

try {
  if ((!email || !password) && admin) {
    const token = randomBytes(10).toString("hex");
    email = `smoke-${token}@hahoanpp.vn`;
    password = `Smoke!${randomBytes(18).toString("base64url")}`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Smoke test" } });
    if (error) throw error;
    temporaryUserId = data.user.id;
  }
  if (!email || !password) throw new Error("Thiếu SMOKE_EMAIL/SMOKE_PASSWORD hoặc service-role key");
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;

  const stamp = Date.now();
  const { data: customer, error: customerError } = await supabase.from("customers").insert({ name: `__smoke_test_${stamp}` }).select("id").single();
  if (customerError) throw customerError;
  ids.customer = customer.id;

  const { data: debt, error: debtError } = await supabase.from("debts").insert({ customer_id: customer.id, amount: 100000, order_date: "2026-08-28", due_days: 30 }).select("id").single();
  if (debtError) throw debtError;
  ids.debt = debt.id;

  const { data: payment, error: paymentError } = await supabase.from("payments").insert({ debt_id: debt.id, amount: 60000, paid_at: "2026-08-28" }).select("id").single();
  if (paymentError) throw paymentError;
  ids.payment = payment.id;

  const { data: returned, error: returnError } = await supabase.from("returns").insert({ debt_id: debt.id, customer_id: customer.id, product_name: "Hàng test", quantity: 1, unit_price: 10000, returned_at: "2026-08-28" }).select("id").single();
  if (returnError) throw returnError;
  ids.returned = returned.id;

  const { data: overview, error: overviewError } = await supabase.from("debt_overview").select("remaining_amount,status").eq("id", debt.id).single();
  if (overviewError) throw overviewError;
  if (Number(overview.remaining_amount) !== 30000) throw new Error(`Dư nợ sai: ${overview.remaining_amount}`);

  const { error: overpayError } = await supabase.from("payments").insert({ debt_id: debt.id, amount: 40000, paid_at: "2026-08-28" });
  if (!overpayError) throw new Error("Database không chặn thanh toán vượt nợ");

  console.log(JSON.stringify({ auth: "ok", rls_crud: "ok", remaining_amount: Number(overview.remaining_amount), status: overview.status, overpayment_guard: "ok" }, null, 2));
} finally {
  if (ids.returned) await supabase.from("returns").delete().eq("id", ids.returned);
  if (ids.payment) await supabase.from("payments").delete().eq("id", ids.payment);
  if (ids.debt) await supabase.from("debts").delete().eq("id", ids.debt);
  if (ids.customer) await supabase.from("customers").delete().eq("id", ids.customer);
  await supabase.auth.signOut();
  if (temporaryUserId && admin) await admin.auth.admin.deleteUser(temporaryUserId);
}
